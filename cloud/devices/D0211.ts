import HADevice from './base'
import { Device as Thinq2Device } from '../thinq2/device'
import { type Connection } from '../homeassistant'
import { type Metadata } from '../thinq'
import { allowExtendedType } from '@/util/casting'
import AABBDevice from './aabb_device'

// LG D0211 ThinQ dishwasher (deviceType 204) — DB365TXS / DBC435TSL.AASQEIS.
//
// SCAFFOLD — the TLV field decoding is still TODO. This registers the model so
// rethink no longer reports "thinq2 device type D0211 unknown", and it exposes
// the target entity set. The raw captures (research/captures/ in
// lg-dishwasher-local) will pin the exact field IDs and packet framing that
// replace the TODO markers below. The washer definitions (F_V8_Y___W.B_2QEUK)
// are the decoding template.
//
// The entity set mirrors the official ha-smartthinq-sensors integration (the
// `lg_lavastoviglie_*` entities) so existing automations keep working, plus the
// cloud fields that integration drops (superset).

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
                        state_topic: '$this/run_state',
                        name: 'Run state',
                        icon: 'mdi:dishwasher',
                        device_class: 'enum',
                    },
                    current_course: {
                        platform: 'sensor',
                        unique_id: '$deviceid-current_course',
                        state_topic: '$this/current_course',
                        name: 'Current course',
                        icon: 'mdi:playlist-play',
                        device_class: 'enum',
                    },
                    process_state: {
                        platform: 'sensor',
                        unique_id: '$deviceid-process_state',
                        state_topic: '$this/process_state',
                        name: 'Process state',
                        icon: 'mdi:state-machine',
                        device_class: 'enum',
                    },
                    remaining_time: {
                        platform: 'sensor',
                        unique_id: '$deviceid-remaining_time',
                        state_topic: '$this/remaining_time',
                        name: 'Remaining time',
                        icon: 'mdi:timer-outline',
                        device_class: 'duration',
                    },
                    countdown_time: {
                        platform: 'sensor',
                        unique_id: '$deviceid-countdown_time',
                        state_topic: '$this/countdown_time',
                        name: 'Countdown time',
                        icon: 'mdi:timer-sand',
                        device_class: 'duration',
                    },
                    initial_time: {
                        platform: 'sensor',
                        unique_id: '$deviceid-initial_time',
                        state_topic: '$this/initial_time',
                        name: 'Initial time',
                        icon: 'mdi:timer-outline',
                        device_class: 'duration',
                    },
                    run_completed: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-run_completed',
                        state_topic: '$this/run_completed',
                        name: 'Run completed',
                        icon: 'mdi:check-circle-outline',
                    },
                    error_state: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-error_state',
                        state_topic: '$this/error_state',
                        name: 'Error state',
                        icon: 'mdi:alert-circle',
                        device_class: 'problem',
                    },
                    error_message: {
                        platform: 'sensor',
                        unique_id: '$deviceid-error_message',
                        state_topic: '$this/error_message',
                        name: 'Error message',
                        icon: 'mdi:alert-circle-outline',
                        device_class: 'enum',
                    },
                    salt_refill: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-salt_refill',
                        state_topic: '$this/salt_refill',
                        name: 'Salt refill',
                        icon: 'mdi:water',
                    },
                    rinse_refill: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-rinse_refill',
                        state_topic: '$this/rinse_refill',
                        name: 'Rinse aid refill',
                        icon: 'mdi:water-plus',
                    },
                    door_open: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-door_open',
                        state_topic: '$this/door_open',
                        name: 'Door open',
                        icon: 'mdi:door-open',
                        device_class: 'door',
                    },
                    auto_door: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-auto_door',
                        state_topic: '$this/auto_door',
                        name: 'Auto door',
                        icon: 'mdi:door',
                    },
                    child_lock: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-child_lock',
                        state_topic: '$this/child_lock',
                        name: 'Child lock',
                        icon: 'mdi:lock',
                        device_class: 'lock',
                    },
                    dual_zone: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-dual_zone',
                        state_topic: '$this/dual_zone',
                        name: 'Dual zone',
                        icon: 'mdi:layers',
                    },
                    extra_dry: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-extra_dry',
                        state_topic: '$this/extra_dry',
                        name: 'Extra dry',
                        icon: 'mdi:weather-sunny',
                    },
                    high_temp: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-high_temp',
                        state_topic: '$this/high_temp',
                        name: 'High temp',
                        icon: 'mdi:thermometer-high',
                    },
                    night_dry: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-night_dry',
                        state_topic: '$this/night_dry',
                        name: 'Night dry',
                        icon: 'mdi:weather-night',
                    },
                    steam: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-steam',
                        state_topic: '$this/steam',
                        name: 'Steam',
                        icon: 'mdi:weather-fog',
                    },
                    half_load: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-half_load',
                        state_topic: '$this/half_load',
                        name: 'Half load',
                        icon: 'mdi:shaker-outline',
                    },
                    tub_clean_counter: {
                        platform: 'sensor',
                        unique_id: '$deviceid-tub_clean_counter',
                        state_topic: '$this/tub_clean_counter',
                        name: 'Tub clean count',
                        icon: 'mdi:counter',
                    },
                    delay_start: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-delay_start',
                        state_topic: '$this/delay_start',
                        name: 'Delay start',
                        icon: 'mdi:timer-cog-outline',
                    },
                    remote_start: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-remote_start',
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
    //   buf[11]/[12]   remaining time (hour, minute)   e.g. 02 35 = 2:53, 1/min countdown
    //   buf[15]        status bitfield: bit 3 (0x08) = salt refill, bit 1 (0x02) = door open
    //                  (Auto Open Dry; the cloud does NOT report this — our superset).
    //   buf[16]        course  0x00=Eco, 0x02=Auto (clears to 0x00 at cycle end) — verified
    //                  2026-09-18 with a second full wash.
    // Still TODO (need more washes/options): option bits (dual_zone/half_load/steam/high_temp/
    // extra_dry/energy_saver/...), error codes, rinse_refill.
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

        // Seconds, so HA's `duration` device_class renders HH:MM:SS.
        this.publishProperty('initial_time', initialH * 3600 + initialM * 60)
        this.publishProperty('remaining_time', remainingH * 3600 + remainingM * 60)

        const STATES: Record<number, string> = {
            0x01: 'Avvio',
            0x02: 'Lavaggio',
            0x04: 'Finito',
            0x05: 'Completamento',
        }
        const PROCESS: Record<number, string> = {
            0x02: 'Lavaggio',
            0x03: 'Risciacquo',
            0x04: 'Asciugatura',
            0x00: 'None',
        }
        const COURSES: Record<number, string> = { 0x00: 'Eco', 0x02: 'Auto' }
        this.publishProperty('run_state', STATES[buf[4]] ?? String(buf[4]))
        this.publishProperty('process_state', PROCESS[buf[5]] ?? String(buf[5]))

        // Course clears to 0x00 once the cycle ends (state 0x04/0x05); only publish
        // a course while the cycle is active, otherwise 'None'.
        const courseActive = buf[4] === 0x01 || buf[4] === 0x02
        this.publishProperty('current_course', courseActive ? (COURSES[buf[16]] ?? String(buf[16])) : 'None')

        this.publishProperty('salt_refill', buf[15] & 0x08 ? 'ON' : 'OFF')
        this.publishProperty('door_open', buf[15] & 0x02 ? 'ON' : 'OFF')
    }

    setProperty(prop: string, mqttValue: string) {
        // Dishwasher is read-mostly; any command surface (remote start, etc.)
        // is TODO until the captures show what the device accepts.
        console.warn(`D0211: unsupported property ${prop} (value ${mqttValue})`)
    }
}
