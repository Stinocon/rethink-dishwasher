# rethink — dishwasher fork

Fork of [anszom/rethink](https://github.com/anszom/rethink) that adds support for **LG ThinQ
dishwashers** (model `D0211`, deviceType 204 — sold as DB365TXS / DBC435TSL and similar).

Everything else is upstream rethink unchanged. For how rethink works, the appliances it already
supports, installation, the management UI and the tooling, see the
[upstream README](https://github.com/anszom/rethink) and
[wiki](https://github.com/anszom/rethink/wiki).

## What this fork adds

| File                                               | What it is                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| [`cloud/devices/D0211.ts`](cloud/devices/D0211.ts) | the dishwasher definition — registers the model and exposes the target entity set |
| [`cloud/ha_bridge.ts`](cloud/ha_bridge.ts)         | one registry line mapping `D0211` to that definition                              |

## Status — core status decode implemented, remaining option bits pending

The dishwasher is **registered** (rethink no longer reports `thinq2 device type D0211 unknown`)
and the target entities are **exposed** — run state, current program, remaining time, cycle end,
error state, salt / rinse-aid refill, and the option flags (door, child lock, auto door, dual
zone, extra dry, high temp, night dry).

The TLV **decode covers the core status fields**, validated against six bridge captures of a
real appliance (Eco, Auto ± Energy Saver, Intensive ± Steam): run state, process state,
initial/remaining time, salt refill, door open, the **course** byte (Eco `0x05`, Auto `0x01`,
Intensive `0x02`), and the **energy saver** and **steam** options (bits 1 and 7 of `buf[16]`,
each pinned by a one-option-at-a-time comparison against the same programme). `run_state` is **granular** (Italian
labels: `Avvio` / `In corso` / `Finito` / `Completamento`), and a separate `running` binary
(on/off) is published for automations that need a simple active/inactive signal. Times are
published as `HH:MM:SS` strings. Every component carries an explicit `default_entity_id`, so the
entity IDs are deterministic (`sensor.lg_dishwasher_*` / `binary_sensor.lg_dishwasher_*`)
rather than slugified from the English names. Still unimplemented: the other option bits
(`dual_zone`, `half_load`, `high_temp`, `extra_dry`), `error`, `rinse_refill`, and the full
course enum. The decode
is documented in the companion
[lg-dishwasher-local](https://github.com/Stinocon/lg-dishwasher-local) project
(`research/notes/raw-tlv-decode.md`).

## Why a fork instead of an upstream pull request

Two reasons, in order:

1. **Control over what I run.** I prefer to build and run my own add-on from my own repository,
   even when it is a fork of someone else's work.
2. **Test before contributing.** The dishwasher definition is developed and validated here, on a
   real appliance, before it is ready to be offered upstream. Once it decodes a real cycle and
   proves itself, an upstream pull request will follow.

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
