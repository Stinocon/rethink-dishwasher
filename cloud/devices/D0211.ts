import HADevice from './base'
import { Device as Thinq2Device } from '../thinq2/device'
import { type Connection } from '../homeassistant'
import { type Metadata } from '../thinq'
import { allowExtendedType } from '@/util/casting'
import AABBDevice from './aabb_device'
import log from '@/util/logging'

// LG D0211 ThinQ dishwasher (deviceType 204) — DB365TXS / DBC435TSL.AASQEIS.
//
// Registers the model and exposes the target entity set. The TLV decode covers the core
// status fields (validated against seven bridge captures of a real appliance — Eco, Auto ±
// Energy Saver, Intensive ± Steam, Auto + Dual Zone). The option and status bitfields are read
// but partly transferred from an independent implementation and are still being confirmed.
// Every declared component is published by the decode — nothing is declared that could never be
// filled — so the entity set grows as the appliance is observed further, and the six transferred
// positions stay flagged as predictions until a wash confirms them. Still undecoded and
// therefore absent: the error codes, the rinse-aid indicator, the auto-door status, the
// delay-start countdown, remote start and the completed-cycle flag.
// See the processAABB comment for the field layout and the provenance of every bit, and the
// companion lg-dishwasher-local project (research/notes/raw-tlv-decode.md) for the full schema.
//
// The entity set mirrors the official ha-smartthinq-sensors integration (the
// `lg_lavastoviglie_*` entities), plus the cloud fields that integration drops (superset).
// Every component carries an explicit `default_entity_id` so the entity_id is deterministic
// (`sensor.lg_dishwasher_*` / `binary_sensor.lg_dishwasher_*`) instead of being slugified from
// the English name. Two consequences for a consumer written against the official integration:
// the published state strings here are English ('Running', not 'In corso'), and the two time
// sensors publish whole minutes, not an "H:MM:SS" string.

// Frame types, discriminated by the second byte of the AABB body (the AA+len prefix and the
// checksum+BB suffix are already stripped by the time processAABB is called).
const STATUS_FRAME_TYPE = 0xec // two stacked records: record1 = prior minute, record2 = current
const SINGLE_STATUS_FRAME_TYPE = 0xeb // one record, the current reading
const TRANSITION_FRAME_TYPE = 0xd8 // 32 d8 <n>: rinse->dry transition, payload undecoded

export default class Device extends AABBDevice {
    constructor(HA: Connection, thinq: Thinq2Device, meta: Metadata) {
        super(HA, thinq)
        this.setConfig(
            allowExtendedType({
                ...HADevice.config(meta, { name: 'LG Dishwasher' }),
                components: {
                    run_state: {
                        platform: 'sensor',
                        unique_id: '$deviceid-run_state',
                        default_entity_id: 'sensor.lg_dishwasher_run_state',
                        state_topic: '$this/run_state',
                        name: 'Run state',
                        icon: 'mdi:dishwasher',
                        device_class: 'enum',
                    },
                    running: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-running',
                        default_entity_id: 'binary_sensor.lg_dishwasher_running',
                        state_topic: '$this/running',
                        name: 'Running',
                        icon: 'mdi:play-circle',
                    },
                    current_course: {
                        platform: 'sensor',
                        unique_id: '$deviceid-current_course',
                        default_entity_id: 'sensor.lg_dishwasher_current_course',
                        state_topic: '$this/current_course',
                        name: 'Current course',
                        icon: 'mdi:playlist-play',
                        device_class: 'enum',
                    },
                    process_state: {
                        platform: 'sensor',
                        unique_id: '$deviceid-process_state',
                        default_entity_id: 'sensor.lg_dishwasher_process_state',
                        state_topic: '$this/process_state',
                        name: 'Process state',
                        icon: 'mdi:state-machine',
                        device_class: 'enum',
                    },
                    remaining_time: {
                        platform: 'sensor',
                        unique_id: '$deviceid-remaining_time',
                        default_entity_id: 'sensor.lg_dishwasher_remaining_time',
                        state_topic: '$this/remaining_time',
                        name: 'Remaining time',
                        icon: 'mdi:timer-outline',
                        device_class: 'duration',
                        unit_of_measurement: 'min',
                    },
                    initial_time: {
                        platform: 'sensor',
                        unique_id: '$deviceid-initial_time',
                        default_entity_id: 'sensor.lg_dishwasher_initial_time',
                        state_topic: '$this/initial_time',
                        name: 'Initial time',
                        icon: 'mdi:timer-outline',
                        device_class: 'duration',
                        unit_of_measurement: 'min',
                    },
                    salt_refill: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-salt_refill',
                        default_entity_id: 'binary_sensor.lg_dishwasher_salt_refill',
                        state_topic: '$this/salt_refill',
                        name: 'Salt refill',
                        icon: 'mdi:water',
                    },
                    door_open: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-door_open',
                        default_entity_id: 'binary_sensor.lg_dishwasher_door_open',
                        state_topic: '$this/door_open',
                        name: 'Door open',
                        icon: 'mdi:door-open',
                        device_class: 'door',
                    },
                    child_lock: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-child_lock',
                        default_entity_id: 'binary_sensor.lg_dishwasher_child_lock',
                        state_topic: '$this/child_lock',
                        name: 'Child lock',
                        icon: 'mdi:lock',
                        device_class: 'lock',
                    },
                    dual_zone: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-dual_zone',
                        default_entity_id: 'binary_sensor.lg_dishwasher_dual_zone',
                        state_topic: '$this/dual_zone',
                        name: 'Dual zone',
                        icon: 'mdi:layers',
                    },
                    extra_dry: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-extra_dry',
                        default_entity_id: 'binary_sensor.lg_dishwasher_extra_dry',
                        state_topic: '$this/extra_dry',
                        name: 'Extra dry',
                        icon: 'mdi:weather-sunny',
                    },
                    energy_saver: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-energy_saver',
                        default_entity_id: 'binary_sensor.lg_dishwasher_energy_saver',
                        state_topic: '$this/energy_saver',
                        name: 'Energy saver',
                        icon: 'mdi:leaf',
                    },
                    high_temp: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-high_temp',
                        default_entity_id: 'binary_sensor.lg_dishwasher_high_temp',
                        state_topic: '$this/high_temp',
                        name: 'High temp',
                        icon: 'mdi:thermometer-high',
                    },
                    night_dry: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-night_dry',
                        default_entity_id: 'binary_sensor.lg_dishwasher_night_dry',
                        state_topic: '$this/night_dry',
                        name: 'Night dry',
                        icon: 'mdi:weather-night',
                    },
                    steam: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-steam',
                        default_entity_id: 'binary_sensor.lg_dishwasher_steam',
                        state_topic: '$this/steam',
                        name: 'Steam',
                        icon: 'mdi:weather-fog',
                    },
                    half_load: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-half_load',
                        default_entity_id: 'binary_sensor.lg_dishwasher_half_load',
                        state_topic: '$this/half_load',
                        name: 'Half load',
                        icon: 'mdi:shaker-outline',
                    },
                    tub_clean_counter: {
                        platform: 'sensor',
                        unique_id: '$deviceid-tub_clean_counter',
                        default_entity_id: 'sensor.lg_dishwasher_tub_clean_counter',
                        state_topic: '$this/tub_clean_counter',
                        name: 'Tub clean counter',
                        icon: 'mdi:counter',
                    },
                    delay_start: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-delay_start',
                        default_entity_id: 'binary_sensor.lg_dishwasher_delay_start',
                        state_topic: '$this/delay_start',
                        name: 'Delay start',
                        icon: 'mdi:timer-cog-outline',
                    },
                },
            }),
        )
    }

    // Status query on connect, verified 2026-09-17 via bridge capture: the LG
    // cloud sends `f0ed1121010000001800` (identical to the washers) to make the
    // device push its current status.
    start() {
        this.send(Buffer.from('F0ED1121010000001800', 'hex'))
    }

    // Status frame (AABB inner type 0x32). Layout verified 2026-09-17 from a full ECO-cycle
    // bridge capture and 2026-09-19 (record ordering + Intensive course). Body =
    // [0x32][flag 0xeb|0xec] record1 [record2]. For 0xec (two records) record1 is the PRIOR
    // minute and record2 is the CURRENT reading (remaining time is never larger in record2 —
    // smaller, or equal when the minute has not ticked between the two records; verified across
    // 1099 0xec frames, none with a larger record2);
    // for 0xeb (single record) the record at body[2..27] is the current reading. The handshake
    // hello also starts 0x32 but its second byte is 0x31 ("21" ASCII) — excluded by the flag
    // check. Offsets below are relative to the current record (base = 2 for 0xeb, 28 for 0xec):
    //   [2]      state    machine state, one of the five values listed below
    //   [3]      process  phase within the cycle
    //   [5]/[6]  initial time   (hour, minute)   e.g. 03 05 = 3:05 (Intensive)
    //   [7]      course  0x05=Eco, 0x01=Auto, 0x02=Intensive (clears to 0x00 at cycle end) —
    //                    verified 2026-09-18/19 across Eco, Auto and Intensive washes. Other
    //                    values exist and are published as their decimal code.
    //   [9]/[10] remaining time (hour, minute)   e.g. 02 35 = 2:53, 1/min countdown
    //   [13]     status bitfield, see below
    //   [14]     options bitfield, see below
    //
    // The provenance of every bit is stated per bit. "Transferred" means the position comes from
    // an independent handler for the same record layout: that is a prediction, not a
    // measurement, and it has NOT been observed on this appliance. A transferred bit may
    // therefore be wrong or may never light up; each one is confirmed, or dropped, by a wash
    // that toggles exactly that option, one variable at a time.
    //
    //   [14] options, gated on the active state (the byte clears to 0x00 at cycle end — one
    //        record BEFORE the course byte, i.e. already at state 0x05 while [7] still holds
    //        the course):
    //          0x01 delay start   transferred
    //          0x02 energy saver  verified 2026-09-18
    //          0x04 extra dry     transferred
    //          0x08 high temp     transferred
    //          0x10 dual zone     verified 2026-09-25: a constant-byte diff against the plain
    //                             Auto baseline differs in this byte only, and costs no time
    //          0x20 unassigned by both sides
    //          0x40 half load     transferred
    //          0x80 steam         verified 2026-09-23: the only byte the option moves besides
    //                             the times (+66 min on Intensive)
    //   [13] status, not gated (these are persistent flags, not cycle state):
    //          0x01 child lock    transferred
    //          0x02 door open     verified (Auto Open Dry; the cloud does NOT report this —
    //                             our superset)
    //          0x08 salt refill   verified 2026-09-25 (flips when the salt is refilled)
    //          0x80 night dry     transferred
    //        Bits 0x10/0x20/0x40 are set in every captured status byte (0x70 is the constant
    //        base), unassigned by both sides, so nothing is published from them.
    //        The independent handler reads 0x08 as the rinse-aid indicator. On this appliance it
    //        was measured flipping with the salt, so that is what we publish and rinse_refill
    //        stays unpublished until a wash contradicts it.
    //
    // Transition frame 0x32 0xd8 <n>: a single byte carrying the cycle counter. Emitted once per
    // cycle within a couple of seconds of the process byte moving 0x03 -> 0x04, the rinse->dry
    // transition (6/6 captures: 11:40:16 vs 11:40:15, 18:42:46 vs 18:42:48, 15:48:34 vs
    // 15:48:33, 23:59:38 vs 23:59:38, 11:01:07 vs 11:01:06, 10:39:11 vs 10:39:10).
    //
    // The payload IS the counter, and it is the same number LG's cloud reports as
    // `tubclean_count` (`tclCount`). The cloud's own history settles it: its counter recorded
    // 14, 15, 16, 17, 18, 19, 20 and 21, and for the six whose frames were captured the frame
    // carried that same number 3m50s-6m54s earlier. The two whose frames were never recorded (16
    // and 19) are real washes in the cloud history, and the run never skips: one increment per
    // cycle, whatever programme or option was chosen.
    //
    // The earlier reading of this byte as a programme/option-dependent parameter came from the
    // values rising monotonically, which the run order happened to produce: the counter climbs by
    // one per wash and the washes were run in rising intensity order.
    processAABB(buf: Buffer) {
        if (buf[0] !== 0x32) {
            log('D0211', 'unrecognized frame', buf.toString('hex'))
            return
        }
        if (buf[1] === TRANSITION_FRAME_TYPE && buf.length === 3) {
            this.publishProperty('tub_clean_counter', buf[2])
            return
        }
        if (buf[1] !== STATUS_FRAME_TYPE && buf[1] !== SINGLE_STATUS_FRAME_TYPE) {
            log('D0211', 'unrecognized frame', buf.toString('hex'))
            return
        }
        // 0xec carries two records: record1 = prior minute, record2 = current. Read the
        // current one (skip record1 on 0xec). 0xeb carries a single (current) record.
        const base = buf[1] === STATUS_FRAME_TYPE ? 28 : 2
        if (buf.length < base + 26) {
            log('D0211', 'short frame', buf.toString('hex'))
            return
        }
        const state = buf[base + 2]
        const process = buf[base + 3]
        const initialH = buf[base + 5]
        const initialM = buf[base + 6]
        const course = buf[base + 7]
        const remainingH = buf[base + 9]
        const remainingM = buf[base + 10]
        const statusBits = buf[base + 13]
        const optionBits = buf[base + 14]

        // Sanity: minutes must be 0..59.
        if (initialM > 59 || remainingM > 59 || initialH > 99 || remainingH > 99) {
            log('D0211', 'suspect time fields', buf.toString('hex'))
            return
        }

        // Durations in whole minutes, like the other rethink handlers. Home Assistant's
        // `duration` device class takes a number — an "H:MM:SS" string makes the entity
        // unavailable — and renders it as h:mm:ss on its own. This is a breaking change for the
        // Live Activity automation, which used to parse the string with split(':'): it now
        // reads minutes.
        this.publishProperty('initial_time', initialH * 60 + initialM)
        this.publishProperty('remaining_time', remainingH * 60 + remainingM)

        const STATES: Record<number, string> = {
            0x00: 'Off',
            0x01: 'Initial',
            0x02: 'Running',
            0x04: 'End',
            0x05: 'Completing',
        }
        const PROCESS: Record<number, string> = {
            0x02: 'Washing',
            0x03: 'Rinsing',
            0x04: 'Drying',
            0x05: 'Completing',
            0x00: '-',
        }
        const COURSES: Record<number, string> = { 0x05: 'Eco', 0x01: 'Auto', 0x02: 'Intensive' }
        // run_state = granular machine state; process_state = phase.
        this.publishProperty('run_state', STATES[state] ?? String(state))
        this.publishProperty('process_state', PROCESS[process] ?? String(process))

        // `running` binary (on/off) mirrors the cloud's main on/off sensor — the entity the
        // Live Activity automation keys on (to:on / from:on to:off).
        const active = state === 0x01 || state === 0x02
        this.publishProperty('running', active ? 'ON' : 'OFF')

        // Course clears to 0x00 once the cycle ends (state 0x04/0x05); only publish
        // a course while the cycle is active, otherwise '-'.
        this.publishProperty('current_course', active ? (COURSES[course] ?? String(course)) : '-')

        // Option bits share the [14] byte, which clears at cycle end; gate on the active state
        // so the entities read OFF once the cycle finishes.
        const option = (bit: number) => (active && optionBits & bit ? 'ON' : 'OFF')
        this.publishProperty('delay_start', option(0x01))
        this.publishProperty('energy_saver', option(0x02))
        this.publishProperty('extra_dry', option(0x04))
        this.publishProperty('high_temp', option(0x08))
        this.publishProperty('dual_zone', option(0x10))
        this.publishProperty('half_load', option(0x40))
        this.publishProperty('steam', option(0x80))

        // Status bits are persistent flags, not cycle state, so they are not gated.
        this.publishProperty('child_lock', statusBits & 0x01 ? 'ON' : 'OFF')
        this.publishProperty('door_open', statusBits & 0x02 ? 'ON' : 'OFF')
        this.publishProperty('salt_refill', statusBits & 0x08 ? 'ON' : 'OFF')
        this.publishProperty('night_dry', statusBits & 0x80 ? 'ON' : 'OFF')
    }

    setProperty(prop: string, mqttValue: string) {
        // Dishwasher is read-mostly; any command surface (remote start, etc.)
        // is TODO until the captures show what the device accepts.
        console.warn(`D0211: unsupported property ${prop} (value ${mqttValue})`)
    }
}
