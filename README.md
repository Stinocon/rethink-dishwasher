# rethink — dishwasher fork

Fork of [anszom/rethink](https://github.com/anszom/rethink) that adds support for **LG ThinQ
dishwashers** (model `D0211`, deviceType 204 — sold as DB365TXS / DBC435TSL and similar).

Everything else is upstream rethink unchanged. For how rethink works, the appliances it already
supports, installation, the management UI and the tooling, see the
[upstream README](https://github.com/anszom/rethink) and
[wiki](https://github.com/anszom/rethink/wiki).

## What this fork adds

| File                                                                     | What it is                                                                        |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [`cloud/devices/D0211.ts`](cloud/devices/D0211.ts)                       | the dishwasher definition — registers the model and exposes the target entity set |
| [`cloud/ha_bridge.ts`](cloud/ha_bridge.ts)                               | one registry line mapping `D0211` to that definition                              |
| [`cloud/homeassistant.ts`](cloud/homeassistant.ts)                       | one optional `ComponentInfo` field, so a device can fix its entity ids explicitly |
| [`tests/cloud/devices/D0211.test.ts`](tests/cloud/devices/D0211.test.ts) | the definition's tests, over real frames from the appliance                       |

## Status

The dishwasher is **registered** — rethink no longer reports `thinq2 device type D0211 unknown` —
and the whole published entity set is filled by the decode: run state, a separate `running`
binary, process phase, current course, initial and remaining time, the cycle counter, the three
measured option flags (`energy_saver`, `steam`, `dual_zone`) and the two measured status flags
(`door_open`, `salt_refill`).

The decode is validated against captures of a real appliance (Eco, Auto ± Energy Saver,
Intensive ± Steam, Auto + Dual Zone). Six further option/status bit positions are known from the
sibling D30 handler for the same record layout (delay start, extra dry, high temp, half load,
child lock, night dry); they are documented per bit in the source and **not published**, because
none of them has been observed on this appliance. Each becomes an entity in the commit that
confirms it.

State labels are English (`Off` / `Initial` / `Running` / `End` / `Completing`), not the Italian
ones the official integration uses; a state, phase or course the decode does not know is published
as an unknown value, with the raw code going to the log rather than to an entity; and the two time
sensors publish whole minutes — what Home Assistant's `duration` device class requires. Every
component carries an explicit `default_entity_id`, so the entity ids are deterministic
(`sensor.lg_dishwasher_*` / `binary_sensor.lg_dishwasher_*`) instead of slugified from the English
names.

Still undecoded, and therefore absent: the error codes, a rinse-aid indicator of its own (the bit
that the D30 handler reports as rinse aid is the one this model reports as salt), the auto-door
status, the delay-start countdown, remote start and the completed-cycle flag. The field layout and
the provenance of every bit are in the `processAABB` comment in
[`cloud/devices/D0211.ts`](cloud/devices/D0211.ts).

## Why a fork and an upstream pull request

Two things, in order:

1. **Control over what I run.** I prefer to build and run my own add-on from my own repository,
   even when it is a fork of someone else's work.
2. **Test before contributing.** The dishwasher definition is developed and validated here, on a
   real appliance, and offered to
   [`anszom/rethink`](https://github.com/anszom/rethink) as a pull request. The two carry the same
   handler, and a change to the decode lands in both.

None of this would exist without the rethink authors and everyone who reverse-engineered ThinQ
before us — this fork stands entirely on their work.

## Home Assistant add-on

The add-on packaging lives in
[Stinocon/addons](https://github.com/Stinocon/addons) → `rethink-dishwasher/`. It builds this
fork at image-build time.

## License

GPL-2.0, inherited from [anszom/rethink](https://github.com/anszom/rethink). See
[`COPYING`](COPYING).

LG ThinQ is likely a trademark of LG; the name is used here for identification only, with no
affiliation. This program is distributed without warranty, as the GPL states.
