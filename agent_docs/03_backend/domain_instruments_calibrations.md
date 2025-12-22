# Instruments and Calibrations Domain

## Goal
- Document the core domain model and key API endpoints.

## When to Use
- Modifying instrument or calibration behavior.

## Domain Notes
- Instruments live in `Instrument`.
- Calibrations live in `CalibrationRecord` and link via `instrumentId`.

## Due Logic
- `nextCalibrationDate` stored on records.
- Optionally denormalized on instrument (`nextCalibrationDate`, `lastCalibrationDate`, `calibrationIntervalDays`).
- `PATCH /instruments/:id/calibration` updates denormalized fields.

## API Endpoints
- `/instruments`
- `/instruments/:id`
- `/instruments/:id/calibrations`
- `/instruments/calibrations` (cross-instrument history)

## Web Routes
- `/instruments/*`
- `/calibrations`
