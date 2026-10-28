# System development workflow

Development spans the launcher, original shell/Python tools, device policies,
QML transformations and native analysis. The project does not include LG's
buildable OS source, proprietary drivers or a custom firmware SDK. REA/Ghidra
helps recover behavior; it does not turn a native binary into original source.

## Isolate work

Keep the TV's private dump, source copies and runtime evidence outside the
repository, or in ignored `research-input/` and `research-output/`. Never commit
credentials, unique keys, pairing/account state, raw LG files or decompiler
output. Publishing a transformer, hash and bounded result does not require
publishing its private input. Use one live-TV administrator at a time.

For launcher development, use separate test data/browser profiles. A private
Xvfb display on Linux keeps input away from the owner's desktop. Browser
previews cannot establish native LG overlay behavior.

## Launcher

Use the lockfile and project-local build/packaging tools in `launcher/`.
JavaScript targets ES2015 for this TV's Chrome 68. CSS is not transpiled: avoid
unsupported features such as flex gap or `:has()`. Run the tests and build after
changes. Verify real TV behavior separately; an isolated browser is not webOS.

## Native REA/Ghidra work

Install REA and Ghidra separately. Verify input hashes against the owner's
verified exact-device dump or freshly copied live file; runtime overlays may
differ from the original firmware. Keep output private.

```sh
rea inspect research-input/usr/sbin/ls-hubd --provider ghidra --format json > research-output/hub-overview.json
# Select the function using the provider's observed coordinates/name:
rea function research-input/usr/sbin/ls-hubd <observed-function-address> --provider ghidra --format json > research-output/function.json
```

Confirm the resolved function name before relying on its dossier. For this
PIE executable, the observed Ghidra image base was 0x10000; raw ELF symbol
values were not directly usable as those analysis addresses. This is an
observation from one import, not a universal offset. Code-pointer references
can invoke a handler even if its direct-callers list is empty. Strings alone
are not a dependency graph. Retain indirect/unresolved calls as unknowns.

Use bounded read-only live traces to test hypotheses. BusyBox timeout takes
`-t`; redirect Luna stdin from `/dev/null`, especially inside shell pipelines.
Parse JSON replies: a zero exit code with empty stdout can be a timeout.

## Build the voice UI candidate privately

Copy only the necessary source trees from your own TV into an ignored directory.
The builder accepts only the eight tested input hashes, preserves original
line endings and refuses unknown source bytes. It does not connect to the TV
or deploy anything. Python 3, Node and `qmlformat-qt6` are required.

```sh
mkdir -p research-input research-output
ssh <root-ssh-alias> 'tar -C / -cf - usr/lib/qml/InputPicker usr/lib/qml/QuickSettings' | tar -C research-input -xf -
python3 experiments/build_voice_ui_candidate.py --source-root research-input --output research-output/voice-ui-candidate
node experiments/check_voice_ui_candidate.mjs research-output/voice-ui-candidate
```

The output includes private originals, five candidate files, three deletion
entries, a patch and local check results. Keep all of it private. Qt6 syntax
parses and JavaScript mocks do not establish LG Qt5 runtime compatibility.
The builder covers two UI clients, not the entire voice stack.

## Deploy deliberately

Prepare exact live hash gates, a complete candidate and rollback before writing
anything. Runtime experiments use RAM-only test data and an independent restore
path where practical. Boot or eMMC changes require owner approval. Never replace
signed partitions as an incidental deployment step. No TV modification is
performed by CI, source builds or local unit tests.
