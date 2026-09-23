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
// Status record offsets are relative to the CURRENT record: on an 0xec frame record1 at
// body[2..27] is the PRIOR minute and record2 at body[28..53] is the current reading.
const steamFrame = (hex: string) => buf(hex)

// Sensing, steam selected: state 0x01, course 0x02 (Intensive), rec[14]=0x80, door open
// (rec[13]=0x72) while the load is being prepared. 0xeb = single (current) record.
const SENSING_STEAM = steamFrame('AA2032EB0018010000040B0200040B0000728002040100000000000000004CBB')

// RUNNING, steam on: record1 is the rinsing minute, record2 the drying one (current).
const RUNNING_DRY_STEAM = steamFrame(
    'AA3A32EC0018020300040B0200011F0000708002040100000000000000000018020400040B0200011F000070800204010000000000000000D8BB',
)

// Cycle end: record1 is the last running minute (steam bit still set), record2 is the state
// 0x05 completing record, where the options byte has already cleared while the course byte
// still reads 0x02. Reading record1 instead of record2 would publish steam ON here.
const COMPLETING_OPTIONS_CLEARED = steamFrame(
    'AA3A32EC0018020400040B020000010000728002040100000000000000000018050500040B020000010000720002040100000000000000008DBB',
)

// END: state 0x04, course and options both 0x00.
const END = steamFrame(
    'AA3A32EC0018050500040B020000010000720002040100000000000000000018040000040B0000000100007200020401000000000000000001BB',
)

// Intensive with no options: same programme, same course byte, options byte 0x00.
const RUNNING_INTENSIVE_NO_OPTIONS = steamFrame(
    'AA3A32EC001801000003050200030500007200020401000000000000000000180202000305020003050000700002040100000000000000001EBB',
)

// Device identity handshake (flag 0x31) — not a status frame, must be ignored.
const HANDSHAKE = steamFrame(
    'AA373231020153414134313236333932350000D1DB00008000000000000253414134313236313032300000FFA7FFFC000000000000A5BB',
)

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
    test('config exposes the option flags, including steam', () => {
        const { ha } = makeDevice()
        const components = ha.devices[DEVICE_ID].config!.components as Record<string, unknown>
        for (const c of [
            'run_state',
            'running',
            'process_state',
            'current_course',
            'initial_time',
            'remaining_time',
            'energy_saver',
            'steam',
            'salt_refill',
            'door_open',
        ]) {
            assert.ok(components[c], `component ${c} present`)
        }
        assert.equal(
            (components.steam as Record<string, unknown>).default_entity_id,
            'binary_sensor.lg_dishwasher_steam',
        )
    })

    test('Intensive with no options publishes the course and every option OFF', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', RUNNING_INTENSIVE_NO_OPTIONS)
        const props = propsOf(ha)

        assert.equal(props.run_state, 'In corso')
        assert.equal(props.process_state, 'Lavaggio')
        assert.equal(props.current_course, 'Intensive')
        assert.equal(props.initial_time, '3:05:00')
        assert.equal(props.remaining_time, '3:05:00')
        assert.equal(props.steam, 'OFF')
        assert.equal(props.energy_saver, 'OFF')
        assert.equal(props.door_open, 'OFF')
    })

    test('the steam option bit (rec[14] bit 7) publishes steam ON', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', RUNNING_DRY_STEAM)
        const props = propsOf(ha)

        assert.equal(props.steam, 'ON')
        assert.equal(props.energy_saver, 'OFF', 'bit 1 must not be inferred from bit 7')
        assert.equal(props.run_state, 'In corso')
        assert.equal(props.process_state, 'Asciugatura')
        assert.equal(props.initial_time, '4:11:00')
        assert.equal(props.remaining_time, '1:31:00')
        assert.equal(props.current_course, 'Intensive')
    })

    test('steam is ON while sensing (state 0x01), i.e. before the cycle runs', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', SENSING_STEAM)
        const props = propsOf(ha)

        assert.equal(props.steam, 'ON')
        assert.equal(props.run_state, 'Avvio')
        assert.equal(props.process_state, '-')
        assert.equal(props.running, 'ON')
        assert.equal(props.door_open, 'ON')
    })

    test('on an 0xec frame the CURRENT record wins: the stale steam bit in record1 is not published', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', COMPLETING_OPTIONS_CLEARED)
        const props = propsOf(ha)

        // record1 still carries state 0x02 / process 0x04 / steam 0x80.
        assert.equal(props.run_state, 'Completamento')
        assert.equal(props.process_state, 'Completamento')
        assert.equal(props.steam, 'OFF')
        assert.equal(props.running, 'OFF')
        // The options byte clears one record before the course byte: no course is
        // published once the cycle is no longer active.
        assert.equal(props.current_course, '-')
        assert.equal(props.remaining_time, '0:01:00')
    })

    test('END clears the course and the options', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', END)
        const props = propsOf(ha)

        assert.equal(props.run_state, 'Finito')
        assert.equal(props.process_state, '-')
        assert.equal(props.current_course, '-')
        assert.equal(props.steam, 'OFF')
        assert.equal(props.energy_saver, 'OFF')
        assert.equal(props.running, 'OFF')
    })

    test('a non-status frame publishes nothing', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', HANDSHAKE)
        assert.deepEqual(propsOf(ha), {})
    })
})
