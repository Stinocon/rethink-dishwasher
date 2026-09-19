import HADevice from './base'
import { Device as Thinq2Device } from '../thinq2/device'
import { type Connection } from '../homeassistant'
import { type Metadata } from '../thinq'
import { allowExtendedType } from '@/util/casting'
import AABBDevice from './aabb_device'

// LG D0211 ThinQ dishwasher (deviceType 204) — DB365TXS / DBC435TSL.AASQEIS.
//
// Registers the model and exposes the target entity set. The TLV decode covers the core
// status fields (validated against three full captures of a real appliance — Eco, Auto +
// Energy Saver, Auto without); the remaining option bits / error / rinse_refill are still
// TODO. See the processAABB comment for the field layout, and the companion
// lg-dishwasher-local project (research/notes/raw-tlv-decode.md) for the full schema.
//
// The entity set mirrors the official ha-smartthinq-sensors integration (the
// `lg_lavastoviglie_*` entities) so existing automations keep working, plus the
// cloud fields that integration drops (superset). Every component carries an explicit
// `default_entity_id` so the entity_id is deterministic (`sensor.lg_dishwasher_*` /
// `binary_sensor.lg_dishwasher_*`) instead of being slugified from the English name.

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
                    },
                    countdown_time: {
                        platform: 'sensor',
                        unique_id: '$deviceid-countdown_time',
                        default_entity_id: 'sensor.lg_dishwasher_countdown_time',
                        state_topic: '$this/countdown_time',
                        name: 'Countdown time',
                        icon: 'mdi:timer-sand',
                        device_class: 'duration',
                    },
                    initial_time: {
                        platform: 'sensor',
                        unique_id: '$deviceid-initial_time',
                        default_entity_id: 'sensor.lg_dishwasher_initial_time',
                        state_topic: '$this/initial_time',
                        name: 'Initial time',
                        icon: 'mdi:timer-outline',
                        device_class: 'duration',
                    },
                    run_completed: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-run_completed',
                        default_entity_id: 'binary_sensor.lg_dishwasher_run_completed',
                        state_topic: '$this/run_completed',
                        name: 'Run completed',
                        icon: 'mdi:check-circle-outline',
                    },
                    error_state: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-error_state',
                        default_entity_id: 'binary_sensor.lg_dishwasher_error_state',
                        state_topic: '$this/error_state',
                        name: 'Error state',
                        icon: 'mdi:alert-circle',
                        device_class: 'problem',
                    },
                    error_message: {
                        platform: 'sensor',
                        unique_id: '$deviceid-error_message',
                        default_entity_id: 'sensor.lg_dishwasher_error_message',
                        state_topic: '$this/error_message',
                        name: 'Error message',
                        icon: 'mdi:alert-circle-outline',
                        device_class: 'enum',
                    },
                    salt_refill: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-salt_refill',
                        default_entity_id: 'binary_sensor.lg_dishwasher_salt_refill',
                        state_topic: '$this/salt_refill',
                        name: 'Salt refill',
                        icon: 'mdi:water',
                    },
                    rinse_refill: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-rinse_refill',
                        default_entity_id: 'binary_sensor.lg_dishwasher_rinse_refill',
                        state_topic: '$this/rinse_refill',
                        name: 'Rinse aid refill',
                        icon: 'mdi:water-plus',
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
                    auto_door: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-auto_door',
                        default_entity_id: 'binary_sensor.lg_dishwasher_auto_door',
                        state_topic: '$this/auto_door',
                        name: 'Auto door',
                        icon: 'mdi:door',
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
                        name: 'Tub clean count',
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
                    remote_start: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-remote_start',
                        default_entity_id: 'binary_sensor.lg_dishwasher_remote_start',
                        state_topic: '$this/remote_start',
                        name: 'Remote start',
                        icon: 'mdi:play-circle-outline',
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
    // bridge capture. Body = [0x32][flag 0xeb|0xec] record1 [record2]; record2 is the previous
    // reading (1 min behind) and is ignored. The handshake hello also starts 0x32 but its
    // second byte is 0x31 ("21" ASCII) — excluded by the flag check. Offsets relative to body:
    //   buf[4]         state    0x01=sensing, 0x02=RUNNING, 0x04=END (0x05 = transient completing)
    //   buf[5]         process  0x02=Lavaggio, 0x03=Risciacquo, 0x04=Asciugatura, 0x00=NONE
    //   buf[7]/[8]     initial time   (hour, minute)   e.g. 03 35 = 3:53
    //   buf[9]         course  0x05=Eco, 0x01=Auto (clears to 0x00 at cycle end) — verified
    //                  2026-09-18 with three full washes.
    //   buf[11]/[12]   remaining time (hour, minute)   e.g. 02 35 = 2:53, 1/min countdown
    //   buf[15]        status bitfield: bit 3 (0x08) = salt refill, bit 1 (0x02) = door open
    //                  (Auto Open Dry; the cloud does NOT report this — our superset).
    //   buf[16]        options bitfield: bit 1 (0x02) = energy saver — verified 2026-09-18.
    //                  Like the course byte, it clears to 0x00 at cycle end (state 0x04/0x05).
    // Still TODO (need more washes/options): other option bits (dual_zone/half_load/steam/
    // high_temp/extra_dry/...), error codes, rinse_refill.
    processAABB(buf: Buffer) {
        if (buf.length < 28 || buf[0] !== 0x32 || (buf[1] !== 0xeb && buf[1] !== 0xec)) {
            console.log('D0211 unrecognized frame:', buf.toString('hex'))
            return
        }

        const initialH = buf[7]
        const initialM = buf[8]
        const remainingH = buf[11]
        const remainingM = buf[12]

        // Sanity: minutes must be 0..59.
        if (initialM > 59 || remainingM > 59 || initialH > 99 || remainingH > 99) {
            console.log('D0211 suspect time fields:', buf.toString('hex'))
            return
        }

        // HH:MM:SS strings, matching the cloud `lg_lavastoviglie_*` time format that the
        // Live Activity automation parses with split(':') (H:MM:SS).
        const hms = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}:00`
        this.publishProperty('initial_time', hms(initialH, initialM))
        this.publishProperty('remaining_time', hms(remainingH, remainingM))

        const STATES: Record<number, string> = {
            0x01: 'Avvio',
            0x02: 'In corso',
            0x04: 'Finito',
            0x05: 'Completamento',
        }
        const PROCESS: Record<number, string> = {
            0x02: 'Lavaggio',
            0x03: 'Risciacquo',
            0x04: 'Asciugatura',
            0x00: '-',
        }
        const COURSES: Record<number, string> = { 0x05: 'Eco', 0x01: 'Auto' }
        // run_state = granular machine state (buf[4]); process_state = phase (buf[5]).
        this.publishProperty('run_state', STATES[buf[4]] ?? String(buf[4]))
        this.publishProperty('process_state', PROCESS[buf[5]] ?? String(buf[5]))

        // `running` binary (on/off) mirrors the cloud's main on/off sensor — the entity the
        // Live Activity automation keys on (to:on / from:on to:off).
        const running = buf[4] === 0x01 || buf[4] === 0x02
        this.publishProperty('running', running ? 'ON' : 'OFF')

        // Course clears to 0x00 once the cycle ends (state 0x04/0x05); only publish
        // a course while the cycle is active, otherwise '-'.
        const courseActive = buf[4] === 0x01 || buf[4] === 0x02
        this.publishProperty('current_course', courseActive ? (COURSES[buf[9]] ?? String(buf[9])) : '-')

        // Options bitfield (buf[16]) clears at cycle end like the course byte; gate on
        // active state so the entity reads OFF once the cycle finishes.
        const optionActive = buf[4] === 0x01 || buf[4] === 0x02
        this.publishProperty('energy_saver', optionActive && buf[16] & 0x02 ? 'ON' : 'OFF')
        this.publishProperty('salt_refill', buf[15] & 0x08 ? 'ON' : 'OFF')
        this.publishProperty('door_open', buf[15] & 0x02 ? 'ON' : 'OFF')
    }

    setProperty(prop: string, mqttValue: string) {
        // Dishwasher is read-mostly; any command surface (remote start, etc.)
        // is TODO until the captures show what the device accepts.
        console.warn(`D0211: unsupported property ${prop} (value ${mqttValue})`)
    }
}
