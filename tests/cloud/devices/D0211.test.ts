import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import DUT from '@/cloud/devices/D0211'
import type { Metadata } from '@/cloud/thinq'
import { MockHAConnection, MockThinq2Device, buf } from '@/tests/helpers/mocks'

const DEVICE_ID = 'test-id'
const MODEL_ID = 'D0211'
const META: Metadata = { modelId: MODEL_ID, modelName: MODEL_ID, swVersion: '1' }

// Real wire frames from bridge captures of a DB365TXS / DBC435TSL dishwasher (the evidence
// lives in the companion lg-dishwasher-local project, research/notes/raw-tlv-decode.md).
//
// These are complete AABB packets: the driver strips the AA+length prefix and the checksum+BB
// suffix before processAABB, so inside the body index 0 is the inner type, the CURRENT record
// starts at body[28] on an 0xec frame (record1 is the prior minute) and at body[2] on an 0xeb
// one. Offsets below are relative to the current record, so in a packet they land at
// 30 + offset for 0xec.
const OPTION_BYTE = 14
const STATUS_BYTE = 13
const CURRENT_RECORD_0XEC = 30

// Sensing, steam selected: state 0x01, course 0x02 (Intensive), rec[14]=0x80, door open
// (rec[13]=0x72) while the load is being prepared. 0xeb = single (current) record.
const SENSING_STEAM = buf('AA2032EB0018010000040B0200040B0000728002040100000000000000004CBB')

// RUNNING, steam on: record1 is the rinsing minute, record2 the drying one (current).
const RUNNING_DRY_STEAM = buf(
    'AA3A32EC0018020300040B0200011F0000708002040100000000000000000018020400040B0200011F000070800204010000000000000000D8BB',
)

// Cycle end: record1 is the last running minute (steam bit still set), record2 is the state
// 0x05 completing record, where the options byte has already cleared while the course byte
// still reads 0x02. Reading record1 instead of record2 would publish steam ON here.
const COMPLETING_OPTIONS_CLEARED = buf(
    'AA3A32EC0018020400040B020000010000728002040100000000000000000018050500040B020000010000720002040100000000000000008DBB',
)

// END: state 0x04, course and options both 0x00.
const END = buf(
    'AA3A32EC0018050500040B020000010000720002040100000000000000000018040000040B0000000100007200020401000000000000000001BB',
)

// Intensive with no options: same programme, same course byte, options byte 0x00. Also the base
// for the bit-level tests below, so that a single flipped bit is the only thing lit.
const RUNNING_INTENSIVE_NO_OPTIONS = buf(
    'AA3A32EC001801000003050200030500007200020401000000000000000000180202000305020003050000700002040100000000000000001EBB',
)

// Auto + Dual Zone, 2026-09-25: against the plain Auto baseline the only constant-byte
// difference is rec[14] 0x00 -> 0x10, and the initial time is unchanged at 2:42, so the option
// costs no time. record2 is the current minute (rec[13]=0x70, door closed).
const RUNNING_DUAL_ZONE = buf(
    'AA3A32EC0018010000022A0100022A0000721002040100000000000000000818020200022A0100022A00007010020401000000000000000054BB',
)

// Auto + Energy Saver, 2026-09-18, with the salt indicator lit: record2 rec[13]=0x78 is the
// usual 0x70 plus bit 3 (salt), with the door bit clear (record1 reads 0x7a, door still open).
const RUNNING_SALT = buf(
    'AA3A32EC001801000002390100023900007A020204010000000000000000081802020002390100023900007802020401000000000000000064BB',
)

// The cycle-counter frame, once per cycle at the rinse->dry transition (here 0x11).
const TRANSITION = buf('AA0732D81199BB')

// Device identity handshake (flag 0x31) — not a status frame, must be ignored.
const HANDSHAKE = buf(
    'AA373231020153414134313236333932350000D1DB00008000000000000253414134313236313032300000FFA7FFFC000000000000A5BB',
)

// Set one bit in the current record of a real frame. The transferred bit positions come from an
// independent handler for the same record layout and have never been seen on this appliance, so
// these tests pin which entity a bit drives; the wire position stays the prediction.
function withBit(frame: Buffer, offset: number, bit: number): Buffer {
    const copy = Buffer.from(frame)
    copy[CURRENT_RECORD_0XEC + offset] |= bit
    return copy
}

const OPTION_PROPS = [
    'delay_start',
    'energy_saver',
    'extra_dry',
    'high_temp',
    'dual_zone',
    'half_load',
    'steam',
] as const

function makeDevice() {
    const ha = new MockHAConnection()
    const thinq = new MockThinq2Device(DEVICE_ID, META)
    const dev = new DUT(ha.asConnection(), thinq, META)
    return { ha, thinq, dev }
}

function propsOf(ha: MockHAConnection) {
    return ha.devices[DEVICE_ID].properties
}

describe(MODEL_ID, () => {
    test('config declares exactly the entities the decode feeds, and nothing else', () => {
        const { ha } = makeDevice()
        const components = ha.devices[DEVICE_ID].config!.components as Record<string, unknown>
        // Pinned on purpose. A component declared here but never published appears in Home
        // Assistant as a permanently unknown entity, so this list must equal what processAABB
        // can fill: extend it only together with the decode that feeds the new entity.
        assert.deepEqual(Object.keys(components).sort(), [
            'child_lock',
            'current_course',
            'delay_start',
            'door_open',
            'dual_zone',
            'energy_saver',
            'extra_dry',
            'half_load',
            'high_temp',
            'initial_time',
            'night_dry',
            'process_state',
            'remaining_time',
            'run_state',
            'running',
            'salt_refill',
            'steam',
            'tub_clean_counter',
        ])
        assert.equal(
            (components.steam as Record<string, unknown>).default_entity_id,
            'binary_sensor.lg_dishwasher_steam',
        )
        // A duration sensor needs a unit and a number: an "H:MM:SS" string makes it unavailable.
        for (const c of ['initial_time', 'remaining_time']) {
            const comp = components[c] as Record<string, unknown>
            assert.equal(comp.device_class, 'duration', `${c} device class`)
            assert.equal(comp.unit_of_measurement, 'min', `${c} unit`)
        }
    })

    test('every declared component is reachable from the frames the decode reads', () => {
        // The other direction of the entity set: a component left declared after its publish call
        // was removed is just as much a phantom, and the pinned list above cannot see it. Every
        // publish is unconditional for the frame that carries it, so one status frame plus the
        // counter frame fill all 18 and the two sets must match exactly.
        const { ha, thinq } = makeDevice()
        const components = ha.devices[DEVICE_ID].config!.components as Record<string, unknown>
        thinq.emit('data', RUNNING_INTENSIVE_NO_OPTIONS)
        thinq.emit('data', TRANSITION)

        assert.deepEqual(Object.keys(propsOf(ha)).sort(), Object.keys(components).sort())
    })

    test('Intensive with no options publishes the course and every option OFF', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', RUNNING_INTENSIVE_NO_OPTIONS)
        const props = propsOf(ha)

        assert.equal(props.run_state, 'Running')
        assert.equal(props.process_state, 'Washing')
        assert.equal(props.current_course, 'Intensive')
        assert.equal(props.initial_time, 185)
        assert.equal(props.remaining_time, 185)
        for (const prop of OPTION_PROPS) assert.equal(props[prop], 'OFF', `${prop} OFF`)
        assert.equal(props.door_open, 'OFF')
    })

    test('the steam option bit (rec[14] bit 7) publishes steam ON', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', RUNNING_DRY_STEAM)
        const props = propsOf(ha)

        assert.equal(props.steam, 'ON')
        assert.equal(props.energy_saver, 'OFF', 'bit 1 must not be inferred from bit 7')
        assert.equal(props.run_state, 'Running')
        assert.equal(props.process_state, 'Drying')
        assert.equal(props.initial_time, 251)
        assert.equal(props.remaining_time, 91)
        assert.equal(props.current_course, 'Intensive')
    })

    test('the dual zone bit (rec[14] bit 4) publishes dual zone ON', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', RUNNING_DUAL_ZONE)
        const props = propsOf(ha)

        assert.equal(props.dual_zone, 'ON')
        assert.equal(props.run_state, 'Running')
        assert.equal(props.process_state, 'Washing')
        assert.equal(props.current_course, 'Auto')
        assert.equal(props.initial_time, 162, 'dual zone costs no time against the Auto baseline')
        assert.equal(props.remaining_time, 162)
        // The rest of the same byte must not be inferred from it.
        for (const prop of OPTION_PROPS) {
            if (prop !== 'dual_zone') assert.equal(props[prop], 'OFF', `${prop} OFF`)
        }
    })

    test('each transferred option bit drives exactly its own entity', () => {
        for (const [bit, prop] of [
            [0x01, 'delay_start'],
            [0x04, 'extra_dry'],
            [0x08, 'high_temp'],
            [0x40, 'half_load'],
        ] as const) {
            const { ha, thinq } = makeDevice()
            thinq.emit('data', withBit(RUNNING_INTENSIVE_NO_OPTIONS, OPTION_BYTE, bit))
            const props = propsOf(ha)

            assert.equal(props[prop], 'ON', `${prop} from bit 0x${bit.toString(16)}`)
            for (const other of OPTION_PROPS) {
                if (other !== prop) assert.equal(props[other], 'OFF', `${other} must stay OFF`)
            }
        }
    })

    test('the unassigned option bit (0x20) drives no entity', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', withBit(RUNNING_INTENSIVE_NO_OPTIONS, OPTION_BYTE, 0x20))
        const props = propsOf(ha)

        for (const prop of OPTION_PROPS) assert.equal(props[prop], 'OFF', `${prop} OFF`)
    })

    test('an option bit left set on an inactive frame publishes OFF', () => {
        // Defensive: the options byte is read from the same record as the state byte, and every
        // captured inactive frame carries 0x00 there, so no stale bit has ever been seen. The
        // gate is what keeps a desynchronised bit from publishing ON once the cycle is over.
        const { ha, thinq } = makeDevice()
        thinq.emit('data', withBit(COMPLETING_OPTIONS_CLEARED, OPTION_BYTE, 0x80))
        const props = propsOf(ha)

        assert.equal(props.run_state, 'Completing')
        for (const prop of OPTION_PROPS) assert.equal(props[prop], 'OFF', `${prop} OFF`)
    })

    test('the salt bit (rec[13] bit 3) publishes salt refill', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', RUNNING_SALT)
        const props = propsOf(ha)

        assert.equal(props.salt_refill, 'ON')
        assert.equal(props.door_open, 'OFF', 'record2 has the door bit clear, record1 does not')
        assert.equal(props.energy_saver, 'ON', 'rec[14]=0x02 in the same frame')
    })

    test('the transferred status bits drive child lock and night dry', () => {
        for (const [bit, prop] of [
            [0x01, 'child_lock'],
            [0x80, 'night_dry'],
        ] as const) {
            const { ha, thinq } = makeDevice()
            thinq.emit('data', withBit(RUNNING_INTENSIVE_NO_OPTIONS, STATUS_BYTE, bit))
            const props = propsOf(ha)

            assert.equal(props[prop], 'ON', `${prop} from bit 0x${bit.toString(16)}`)
            const other = prop === 'child_lock' ? 'night_dry' : 'child_lock'
            assert.equal(props[other], 'OFF', `${other} must stay OFF`)
            assert.equal(props.salt_refill, 'OFF', 'salt is bit 3, untouched here')
            assert.equal(props.door_open, 'OFF', 'door is bit 1, untouched here')
        }
    })

    test('steam is ON while sensing (state 0x01), i.e. before the cycle runs', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', SENSING_STEAM)
        const props = propsOf(ha)

        assert.equal(props.steam, 'ON')
        assert.equal(props.run_state, 'Initial')
        assert.equal(props.process_state, '-')
        assert.equal(props.running, 'ON')
        assert.equal(props.door_open, 'ON')
        // The single-record (0xeb) offsets for the course and the two times, which no other
        // frame exercises: a wrong base would leave them wrong and unnoticed.
        assert.equal(props.current_course, 'Intensive')
        assert.equal(props.initial_time, 251)
        assert.equal(props.remaining_time, 251)
    })

    test('on an 0xec frame the CURRENT record wins: the stale steam bit in record1 is not published', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', COMPLETING_OPTIONS_CLEARED)
        const props = propsOf(ha)

        // record1 still carries state 0x02 / process 0x04 / steam 0x80.
        assert.equal(props.run_state, 'Completing')
        assert.equal(props.process_state, 'Completing')
        assert.equal(props.steam, 'OFF')
        assert.equal(props.running, 'OFF')
        // The options byte clears one record before the course byte: no course is
        // published once the cycle is no longer active.
        assert.equal(props.current_course, '-')
        assert.equal(props.remaining_time, 1)
    })

    test('END clears the course and the options', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', END)
        const props = propsOf(ha)

        assert.equal(props.run_state, 'End')
        assert.equal(props.process_state, '-')
        assert.equal(props.current_course, '-')
        assert.equal(props.steam, 'OFF')
        assert.equal(props.energy_saver, 'OFF')
        assert.equal(props.running, 'OFF')
    })

    test('the 0xd8 frame publishes the cycle counter', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', TRANSITION)

        assert.equal(propsOf(ha).tub_clean_counter, 17)
        // A persistent flag, not cycle state: nothing else moves.
        assert.deepEqual(Object.keys(propsOf(ha)), ['tub_clean_counter'])
    })

    test('a non-status frame publishes nothing', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', HANDSHAKE)
        assert.deepEqual(propsOf(ha), {})
    })
})
