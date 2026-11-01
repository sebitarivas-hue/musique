import fs from "fs"; import path from "path";
const FW = path.resolve("node_modules/@grame/faustwasm");
const { instantiateFaustModuleFromFile, LibFaust, FaustCompiler, FaustMonoDspGenerator } = await import(path.join(FW, "dist/esm/index.js"));
const compiler = new FaustCompiler(new LibFaust(await instantiateFaustModuleFromFile(path.join(FW, "libfaust-wasm/libfaust-wasm.js"))));
const [src, sortie] = process.argv.slice(2);
const g = new FaustMonoDspGenerator();
await g.compile(compiler, "reverb", fs.readFileSync(src, "utf8"), "-I " + path.join(FW, "libfaust-wasm"));
if (!g.factory) { console.log("ÉCHEC", compiler.getErrorMessage()); process.exit(1); }
fs.mkdirSync(sortie, { recursive: true });
fs.writeFileSync(path.join(sortie, "dsp-module.wasm"), new Uint8Array(g.factory.code)); fs.writeFileSync(path.join(sortie, "dsp-meta.json"), g.factory.json);
const meta = JSON.parse(g.factory.json); console.log("ok entrées", meta.inputs, "sorties", meta.outputs, "taille", g.factory.code.byteLength, JSON.stringify(meta.ui).slice(0,300));
