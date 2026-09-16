# rethink — dishwasher fork

Fork of [anszom/rethink](https://github.com/anszom/rethink) that adds support for **LG ThinQ
dishwashers** (model `D0211`, deviceType 204 — sold as DB365TXS / DBC435TSL and similar).

Everything else is upstream rethink unchanged. For how rethink works, the appliances it already
supports, installation, the management UI and the tooling, see the
[upstream README](https://github.com/anszom/rethink) and
[wiki](https://github.com/anszom/rethink/wiki).

## What this fork adds

| File | What it is |
| --- | --- |
| [`cloud/devices/D0211.ts`](cloud/devices/D0211.ts) | the dishwasher definition — registers the model and exposes the target entity set |
| [`cloud/ha_bridge.ts`](cloud/ha_bridge.ts) | one registry line mapping `D0211` to that definition |

## Status — dishwasher support is a scaffold

The dishwasher is **registered** (rethink no longer reports `thinq2 device type D0211 unknown`)
and the target entities are **exposed** — run state, current program, remaining time, cycle end,
error state, salt / rinse-aid refill, and the option flags (door, child lock, auto door, dual
zone, extra dry, high temp, night dry).

The TLV field **decoding** is **not implemented yet**: it is being written against live raw
captures of a real appliance. Until then the dishwasher is recognised but not translated to
MQTT, so no entities appear in Home Assistant. Everything else works as upstream.

## Home Assistant add-on

The add-on packaging lives in
[Stinocon/addons](https://github.com/Stinocon/addons) → `rethink-dishwasher/`. It builds this
fork at image-build time.

## License

GPL-2.0, inherited from [anszom/rethink](https://github.com/anszom/rethink). See
[`COPYING`](COPYING).

LG ThinQ is likely a trademark of LG; the name is used here for identification only, with no
affiliation. This program is distributed without warranty, as the GPL states.
