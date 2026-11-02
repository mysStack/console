# release-4.1.5 merged acceptance (after #15 v3 asset preload)

- date: 2026-11-02T05:32:43.963861+00:00
- tip: `ad724a38b` (Merge PR #15)
- image: `ghcr.io/mysstack/ks-console:release-4.1.5-merged-20261102-ad724a3`
- imageID: `ghcr.io/mysstack/ks-console@sha256:5994c1562f8ab6d59bffac3cf39adb22ffe02801b3cc3da74c86c34485605f6e`
- pod: `ks-console-v415-rea-678bbd9d66-qzv89` @ 192.168.2.131:30881

## Results

| check                       | pass |
| --------------------------- | ---- |
| timing (main overlaps HTML) | True |
| correctness                 | True |
| P1                          | True |

### Timing

- cold: visible=1054ms manifest@362 html@547 main@384 dash@3257
- warm: visible=798ms manifest@407 html@416 main@412 dash@3126

### Evidence

- `merged-v3-asset-preload-timing-20261102.json`
- `merged-v3-asset-preload-correctness-20261102.json`
- `merged-v3-asset-preload-p1-20261102.json`
