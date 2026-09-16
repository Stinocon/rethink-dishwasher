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

export default class Device extends AABBDevice {
    constructor(HA: Connection, thinq: Thinq2Device, meta: Metadata) {
        super(HA, thinq)
        this.setConfig(
            allowExtendedType({
                ...HADevice.config(meta, { name: 'LG Dishwasher' }),
                components: {
                    run_state: {
                        platform: 'sensor',
                        unique_id: '$deviceid-run-state',
                        state_topic: '$this/run_state',
                        name: 'Run state',
                        icon: 'mdi:dishwasher',
                    },
                    current_course: {
                        platform: 'sensor',
                        unique_id: '$deviceid-current-course',
                        state_topic: '$this/current_course',
                        name: 'Current course',
                        icon: 'mdi:playlist-play',
                    },
                    remaining_time: {
                        platform: 'sensor',
                        unique_id: '$deviceid-remaining-time',
                        state_topic: '$this/remaining_time',
                        name: 'Remaining time',
                        icon: 'mdi:timer-outline',
                    },
                    run_completed: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-run-completed',
                        state_topic: '$this/run_completed',
                        name: 'Run completed',
                        icon: 'mdi:check-circle-outline',
                    },
                    error_state: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-error-state',
                        state_topic: '$this/error_state',
                        name: 'Error state',
                        icon: 'mdi:alert-circle',
                    },
                    salt_refill: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-salt-refill',
                        state_topic: '$this/salt_refill',
                        name: 'Salt refill',
                        icon: 'mdi:water',
                    },
                    rinse_refill: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-rinse-refill',
                        state_topic: '$this/rinse_refill',
                        name: 'Rinse aid refill',
                        icon: 'mdi:water-plus',
                    },
                    door_open: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-door-open',
                        state_topic: '$this/door_open',
                        name: 'Door open',
                        icon: 'mdi:door-open',
                    },
                    child_lock: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-child-lock',
                        state_topic: '$this/child_lock',
                        name: 'Child lock',
                        icon: 'mdi:lock',
                    },
                    auto_door: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-auto-door',
                        state_topic: '$this/auto_door',
                        name: 'Auto door',
                        icon: 'mdi:door',
                    },
                    dual_zone: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-dual-zone',
                        state_topic: '$this/dual_zone',
                        name: 'Dual zone',
                        icon: 'mdi:layers',
                    },
                    extra_dry: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-extra-dry',
                        state_topic: '$this/extra_dry',
                        name: 'Extra dry',
                        icon: 'mdi:weather-sunny',
                    },
                    high_temp: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-high-temp',
                        state_topic: '$this/high_temp',
                        name: 'High temp',
                        icon: 'mdi:thermometer-high',
                    },
                    night_dry: {
                        platform: 'binary_sensor',
                        unique_id: '$deviceid-night-dry',
                        state_topic: '$this/night_dry',
                        name: 'Night dry',
                        icon: 'mdi:weather-night',
                    },
                },
            }),
        )
    }

    // TODO: send the toDevice status query on connect (the hood sends
    // `f0ed114101000000180403040000` to make the device push its current
    // status). Determine the dishwasher's equivalent from the captures.
    start() {}

    // TODO: decode the dishwasher's AA...BB frames. Placeholder: log raw bytes
    // so the first connected session is still observable in the add-on log.
    processAABB(buf: Buffer) {
        console.log('D0211 undecoded frame:', buf.toString('hex'))
    }

    setProperty(prop: string, mqttValue: string) {
        // Dishwasher is read-mostly; any command surface (remote start, etc.)
        // is TODO until the captures show what the device accepts.
        console.warn(`D0211: unsupported property ${prop} (value ${mqttValue})`)
    }
}
