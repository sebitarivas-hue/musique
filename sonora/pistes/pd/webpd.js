var Sr=null;var Ir=async(e,t)=>{if(!Sr)throw new Error("assemblyscript compiler was not set properly. Please use WebPd's setAsc function to initialize it.");let n={optimizeLevel:3,runtime:"incremental",exportRuntime:!0,sourceMap:!0};t===32&&(n.use=["Math=NativeMathf"]);let{error:r,binary:a,stderr:o}=await Sr.compileString(e,n);if(r)throw new Error(o.toString());return a.buffer};var Il=/\\(\$\d+)/g,bl=/\\\\\\,/g,wl=/\\\\\\;/g,Qe=e=>{try{return b(e)}catch(t){if(!(t instanceof Y))throw t}try{return N(e)}catch(t){if(!(t instanceof Y))throw t}throw new Y(`Not a valid arg ${e}`)},b=e=>{if(Tl(e))return e;if(br(e)){let t=Number(e);if(isNaN(t))throw new Y(`Not a valid number arg ${e}`);return t}else throw new Y(`Not a valid number arg ${e}`)},q=e=>{if(e===void 0)throw new Y("Received undefined");let t=parseInt(e,10);if(isNaN(t))throw new Y("Invalid int received");return t},pe=e=>{let t=b(e);if(t===0||t===1)return t;throw new Y("Should be 0 or 1")},N=(e,t=null)=>{if(!br(e))throw new Y(`Not a valid string arg ${e}`);if(t!==null&&e===t)return"";let n=e.replace(bl,",").replace(wl,";"),r;for(;r=Il.exec(n);)n=n.replace(r[0],r[1]);return n},Y=class extends Error{},Tl=e=>Number.isFinite(e),br=e=>typeof e=="string";var Ze={floatatom:"floatatom",symbolatom:"symbolatom",listbox:"listbox",bng:"bng",tgl:"tgl",nbx:"nbx",vsl:"vsl",hsl:"hsl",vradio:"vradio",hradio:"hradio",vu:"vu",cnv:"cnv",msg:"msg"};var wr=(e,t,n,r)=>{let{tokens:a}=n,o=r?r.tokens:null,i={windowX:q(a[2]),windowY:q(a[3]),windowWidth:q(a[4]),windowHeight:q(a[5])};if(typeof a[7]<"u"&&(i.openOnLoad=pe(a[7])),o&&typeof o[8]<"u"){let l=b(o[8]);i.graphOnParent=l>0?1:0,i.graphOnParent===1&&(i={...i,hideObjectNameAndArguments:l===2?1:0,viewportX:o[9]?q(o[9]):0,viewportY:o[10]?q(o[10]):0,viewportWidth:q(o[6]),viewportHeight:q(o[7])})}return{id:e,isRoot:t,layout:i,args:[],nodes:{},connections:[],inlets:[],outlets:[]}},Tr=(e,{tokens:t})=>{let n=N(t[2]),r=Qe(t[3]),a=q(t[5]),o=a%2,i=["polygon","points","bezier"][a>>>1];return{id:e,args:[n,r,o],data:null,layout:{drawAs:i}}},xr=(e,{tokens:t})=>{let n=t[4],r=[];if(n!=="pd"&&n!=="graph"&&n!=="table")throw new Error(`unknown canvasType : ${n}`);return n==="pd"&&t[5]!==void 0&&r.push(N(t[5])),{id:e,type:n,patchId:N(t[1]),nodeClass:"subpatch",args:r,layout:mn(t)}},_r=(e,{tokens:t})=>({id:e,args:[],type:"array",nodeClass:"array",arrayId:N(t[1]),layout:{}}),Ar=e=>{let t=e[1],n="";switch(t){case"text":return{type:"text",args:[e.slice(4).join(" ")],nodeClass:"text"};case"obj":return n=N(e[4]),{type:n,args:e.slice(5),nodeClass:Object.keys(Ze).includes(n)?"control":"generic"};default:return n=N(t),{type:n,args:e.slice(4),nodeClass:Object.keys(Ze).includes(n)?"control":"generic"}}},Mr=({tokens:e})=>({source:{nodeId:N(e[2]),portletId:q(e[3])},sink:{nodeId:N(e[4]),portletId:q(e[5])}}),kr=(e,t,n,r)=>({id:e,type:t,args:n.map(Qe),nodeClass:"generic",layout:r}),Nr=(e,t,n)=>({id:e,type:"text",args:t.map(Qe),nodeClass:"text",layout:n}),Fr=(e,t,n,r)=>{let a={id:e,type:t,args:n,nodeClass:"control",layout:r};if(a.type==="floatatom"||a.type==="symbolatom"||a.type==="listbox")a.layout={...a.layout,widthInChars:b(n[0]),labelPos:b(n[3]),label:N(n[4],"-")},a.args=[b(n[1]),b(n[2]),N(n[5],"-"),N(n[6],"-")];else if(a.type==="msg")a.args=a.args.map(Qe);else if(a.type==="bng")a.layout={...a.layout,size:b(n[0]),hold:b(n[1]),interrupt:b(n[2]),label:N(n[6],"empty"),labelX:b(n[7]),labelY:b(n[8]),labelFont:n[9],labelFontSize:b(n[10]),bgColor:n[11],fgColor:n[12],labelColor:n[13]},a.args=[pe(n[3]),N(n[5],"empty"),N(n[4],"empty")];else if(a.type==="tgl")a.layout={...a.layout,size:b(n[0]),label:N(n[4],"empty"),labelX:b(n[5]),labelY:b(n[6]),labelFont:n[7],labelFontSize:b(n[8]),bgColor:n[9],fgColor:n[10],labelColor:n[11]},a.args=[b(n[13]),pe(n[1]),b(n[12]),N(n[3],"empty"),N(n[2],"empty")];else if(a.type==="nbx")a.layout={...a.layout,widthInChars:b(n[0]),height:b(n[1]),log:b(n[4]),label:N(n[8],"empty"),labelX:b(n[9]),labelY:b(n[10]),labelFont:n[11],labelFontSize:b(n[12]),bgColor:n[13],fgColor:n[14],labelColor:n[15],logHeight:n[17]},a.args=[b(n[2]),b(n[3]),pe(n[5]),b(n[16]),N(n[7],"empty"),N(n[6],"empty")];else if(a.type==="vsl"||a.type==="hsl"){a.layout={...a.layout,width:b(n[0]),height:b(n[1]),log:b(n[4]),label:N(n[8],"empty"),labelX:b(n[9]),labelY:b(n[10]),labelFont:n[11],labelFontSize:b(n[12]),bgColor:n[13],fgColor:n[14],labelColor:n[15],steadyOnClick:n[17]};let o=b(n[2]),i=b(n[3]),l=pe(n[4]),d=b(n[16]),p=a.type==="hsl"?a.layout.width:a.layout.height,m=0;if(l){let $=Math.log(i/o)/(p-1);m=o*Math.exp($*d*.01)}else m=o+(i-o)*d/((p-1)*100);a.args=[o,i,pe(n[5]),m,N(n[7],"empty"),N(n[6],"empty")]}else if(a.type==="vradio"||a.type==="hradio")a.layout={...a.layout,size:b(n[0]),label:N(n[6],"empty"),labelX:b(n[7]),labelY:b(n[8]),labelFont:n[9],labelFontSize:b(n[10]),bgColor:n[11],fgColor:n[12],labelColor:n[13]},a.args=[b(n[3]),pe(n[2]),b(n[14]),N(n[5],"empty"),N(n[4],"empty"),pe(n[2])];else if(a.type==="vu")a.layout={...a.layout,width:b(n[0]),height:b(n[1]),label:N(n[3],"empty"),labelX:b(n[4]),labelY:b(n[5]),labelFont:n[6],labelFontSize:b(n[7]),bgColor:n[8],labelColor:n[9],log:b(n[10])},a.args=[N(n[2],"empty"),N(n[11])];else if(a.type==="cnv")a.layout={...a.layout,size:b(n[0]),width:b(n[1]),height:b(n[2]),label:N(n[5],"empty"),labelX:b(n[6]),labelY:b(n[7]),labelFont:n[8],labelFontSize:b(n[9]),bgColor:n[10],labelColor:n[11]},a.args=[N(n[4],"empty"),N(n[3],"empty"),N(n[12])];else throw new Error(`Unexpected control node ${a.type}`);return a};function vr(e,t){if(t){let n=t;for(;n.length;)n.shift()==="f"&&(e.layout.width=b(n.shift()))}return e}var mn=e=>({x:q(e[2]),y:q(e[3])});var xl=/(?<comma>((?<!\\)\s*)((?<!\\\\)\\,)((?<!\\)\s*))|(?<semi>((?<!\\)\s*)((?<!\\\\)\\;)((?<!\\)\s*))|((?<!\\)\s)+|\r\n?|\n/,_l=/,(?!\\)/,Er=/(#((.|\r|\n)*?)[^\\\\])\r{0,1}\n{0,1};\r{0,1}(\n|$)/gi,Or=e=>e.split("").reverse().join(""),Cr=e=>{let t=[];Er.lastIndex=0;let n=null;for(;n=Er.exec(e);){let r=Or(n[1]).split(_l).reverse().map(Or),a=e.slice(0,n.index).split(`
`).length-1;t.push({tokens:Lr(r[0]),lineAfterComma:r[1]?Lr(r[1]):void 0,lineIndex:a})}return t},Lr=e=>{let t=Array.from(e.matchAll(new RegExp(xl,"g"))),n=[];t.forEach((a,o)=>{let i=o===0?0:t[o-1].index+t[o-1][0].length,l=a.index,d=e.slice(i,l);d.length&&n.push(d),a[1]?n.push(","):a[5]&&n.push(";")});let r=t.slice(-1)[0];if(r){let a=e.slice(r.index+r[0].length);a.length&&n.push(a)}return n};var Al=100,Ml=["obj","floatatom","symbolatom","listbox","msg","text"],fn=()=>`${++fn.counter}`;fn.counter=-1;var gn=()=>`${++gn.counter}`;gn.counter=-1;var z=(e,...t)=>t.every((n,r)=>n===e[r]),Rr=e=>{let t=Cr(e),r={pd:{rootPatchId:"0",patches:{},arrays:{}},errors:[],warnings:[],tokenizedLines:t,patchTokenizedLinesMap:{}};return hn(r,!0),Object.keys(r.pd.patches).forEach(a=>{Nl(r,a),Fl(r,a),kl(r,a),r.patchTokenizedLinesMap[a].length&&r.patchTokenizedLinesMap[a].forEach(({tokens:o,lineIndex:i})=>{r.errors.push({message:`"${o[0]} ${o[1]}" unexpected chunk`,lineIndex:i})})}),r.errors.length?{status:1,warnings:r.warnings,errors:r.errors}:{status:0,warnings:r.warnings,pd:r.pd}},hn=(e,t)=>{let n=fn(),r=[],a=null,o=null,i=-1,l=!0,d=e.tokenizedLines[0]?e.tokenizedLines[0].lineIndex:-1;for(;e.tokenizedLines.length&&l;){let{tokens:p,lineIndex:m}=e.tokenizedLines[0];if(z(p,"#N","struct")||z(p,"#X","declare")||z(p,"#X","scalar")||z(p,"#X","f")){e.warnings.push({message:`"${p[0]} ${p[1]}" chunk is not supported`,lineIndex:m}),e.tokenizedLines.shift();continue}i++,yn(e,m,()=>{if(z(p,"#N","canvas")&&i===0)a=e.tokenizedLines.shift();else if(z(p,"#N","canvas"))hn(e,!1);else if(z(p,"#X","obj",p[2],p[3],"table")){let $=e.tokenizedLines.shift().tokens;e.tokenizedLines=[{tokens:["#N","canvas","0","0","100","100","(subpatch)","0"],lineIndex:m},{tokens:["#N","canvas","0","0","100","100","(subpatch)","0"],lineIndex:m},{tokens:["#X","array",N($[5]),$[6]||Al.toString(),"float","0"],lineIndex:m},{tokens:["#X","restore","0","0","graph"],lineIndex:m},{tokens:["#X","restore",$[2],$[3],"table"],lineIndex:m},...e.tokenizedLines],hn(e,!1)}else z(p,"#X","coords")?o=e.tokenizedLines.shift():z(p,"#X","restore")?(e.tokenizedLines[0].tokens=["PATCH",n,...e.tokenizedLines[0].tokens.slice(2)],l=!1):r.push(e.tokenizedLines.shift())})}if(a===null){e.errors.push({message:"Parsing failed #canvas missing",lineIndex:d});return}t&&(e.pd.rootPatchId=n),e.pd.patches[n]=wr(n,t,a,o),e.patchTokenizedLinesMap[n]=r},kl=(e,t)=>{let n=e.pd.patches[t],r=(p,m)=>parseFloat(p.id)-parseFloat(m.id),a=(p,m)=>p.layout.x-m.layout.x,o=Object.values(n.nodes).filter(p=>["inlet","inlet~"].includes(p.type)),i=o.every(p=>!!p.layout)?a:r;o.sort(i);let l=Object.values(n.nodes).filter(p=>["outlet","outlet~"].includes(p.type)),d=l.every(p=>!!p.layout)?a:r;l.sort(d),e.pd.patches[t]={...n,inlets:o.map(p=>p.id),outlets:l.map(p=>p.id)}},Nl=(e,t)=>{let n=e.patchTokenizedLinesMap[t],r=[],a=null;for(;n.length;){let{tokens:o,lineIndex:i}=n[0];yn(e,i,()=>{if(z(o,"#X","array"))a=Tr(gn(),n.shift()),e.pd.arrays[a.id]=a,r.push({tokens:["ARRAY",a.id],lineAfterComma:[],lineIndex:i});else if(z(o,"#A")){if(!a)throw new Error(`line ${i}: Unsupported data chunk #A.`);if(a.args[2]===0)throw new Error("got array data for an array that doesn't save contents.");let l=a.data||[];a.data=l;let d=b(o[1]);o.slice(2).forEach((p,m)=>{let $=b(p);Number.isFinite($)&&(l[d+m]=$)}),n.shift()}else r.push(n.shift())})}e.patchTokenizedLinesMap[t]=r},Fl=(e,t)=>{let n=e.pd.patches[t],r=e.patchTokenizedLinesMap[t],a=[],o=-1,i=()=>`${++o}`;for(;r.length;){let{tokens:l,lineIndex:d}=r[0];yn(e,d,()=>{let p=null;if(z(l,"PATCH"))p=xr(i(),r.shift());else if(z(l,"ARRAY"))p=_r(i(),r.shift());else if(Ml.some(m=>z(l,"#X",m))){let m=r.shift(),{nodeClass:$,type:M,args:x}=Ar(m.tokens),k=mn(m.tokens);$==="control"?p=Fr(i(),M,x,k):$==="text"?p=Nr(i(),x,k):p=kr(i(),M,x,k),p=vr(p,m.lineAfterComma)}if(p){n.nodes[p.id]=p;return}z(l,"#X","connect")?n.connections.push(Mr(r.shift())):a.push(r.shift())})}e.patchTokenizedLinesMap[t]=a},yn=(e,t,n)=>{try{n()}catch(r){if(r instanceof Y)e.errors.push({message:r.message,lineIndex:t});else throw r}};var et=(e,t)=>{let n=e[t];if(!n)throw new Error(`no artefact was generated for ${t}`);return n},Pe=e=>new TextDecoder().decode(e);var Pr=`var WebPdRuntime = (function (exports) {
  'use strict';

  var WEB_PD_WORKLET_PROCESSOR_CODE = "/*\\n * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.\\n *\\n * This file is part of WebPd\\n * (see https://github.com/sebpiq/WebPd).\\n *\\n * This program is free software: you can redistribute it and/or modify\\n * it under the terms of the GNU Lesser General Public License as published by\\n * the Free Software Foundation, either version 3 of the License, or\\n * (at your option) any later version.\\n *\\n * This program is distributed in the hope that it will be useful,\\n * but WITHOUT ANY WARRANTY; without even the implied warranty of\\n * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the\\n * GNU Lesser General Public License for more details.\\n *\\n * You should have received a copy of the GNU Lesser General Public License\\n * along with this program. If not, see <http://www.gnu.org/licenses/>.\\n */\\nconst FS_CALLBACK_NAMES = [\\n    'onReadSoundFile',\\n    'onOpenSoundReadStream',\\n    'onWriteSoundFile',\\n    'onOpenSoundWriteStream',\\n    'onSoundStreamData',\\n    'onCloseSoundStream',\\n];\\nclass WasmWorkletProcessor extends AudioWorkletProcessor {\\n    constructor() {\\n        super();\\n        this.port.onmessage = this.onMessage.bind(this);\\n        this.settings = {\\n            blockSize: null,\\n            sampleRate,\\n        };\\n        this.dspConfigured = false;\\n        this.engine = null;\\n    }\\n    process(inputs, outputs) {\\n        const output = outputs[0];\\n        const input = inputs[0];\\n        if (!this.dspConfigured) {\\n            if (!this.engine) {\\n                return true;\\n            }\\n            this.settings.blockSize = output[0].length;\\n            this.engine.initialize(this.settings.sampleRate, this.settings.blockSize);\\n            this.dspConfigured = true;\\n        }\\n        this.engine.dspLoop(input, output);\\n        return true;\\n    }\\n    onMessage(messageEvent) {\\n        const message = messageEvent.data;\\n        switch (message.type) {\\n            case 'code:WASM':\\n                this.setWasm(message.payload.wasmBuffer);\\n                break;\\n            case 'code:JS':\\n                this.setJsCode(message.payload.jsCode);\\n                break;\\n            case 'io:messageReceiver':\\n                this.engine.io.messageReceivers[message.payload.nodeId][message.payload.portletId](message.payload.message);\\n                break;\\n            case 'fs':\\n                const returned = this.engine.globals.fs[message.payload.functionName].apply(null, message.payload.arguments);\\n                this.port.postMessage({\\n                    type: 'fs',\\n                    payload: {\\n                        functionName: message.payload.functionName + '_return',\\n                        operationId: message.payload.arguments[0],\\n                        returned,\\n                    },\\n                });\\n                break;\\n            case 'destroy':\\n                this.destroy();\\n                break;\\n            default:\\n                new Error(\`unknown message type \${message.type}\`);\\n        }\\n    }\\n    // TODO : control for channelCount of wasmModule\\n    setWasm(wasmBuffer) {\\n        return AssemblyScriptWasmBindings.createEngine(wasmBuffer).then((engine) => this.setEngine(engine));\\n    }\\n    setJsCode(code) {\\n        const engine = JavaScriptBindings.createEngine(code);\\n        this.setEngine(engine);\\n    }\\n    setEngine(engine) {\\n        if (engine.globals.fs) {\\n            FS_CALLBACK_NAMES.forEach((functionName) => {\\n                engine.globals.fs[functionName] = (...args) => {\\n                    // We don't use transferables, because that would imply reallocating each time new array in the engine.\\n                    this.port.postMessage({\\n                        type: 'fs',\\n                        payload: {\\n                            functionName,\\n                            arguments: args,\\n                        },\\n                    });\\n                };\\n            });\\n        }\\n        Object.entries(engine.metadata.settings.io.messageSenders).forEach(([nodeId, portletIds]) => {\\n            portletIds.forEach((portletId) => {\\n                engine.io.messageSenders[nodeId][portletId] = (message) => {\\n                    this.port.postMessage({\\n                        type: 'io:messageSender',\\n                        payload: {\\n                            nodeId,\\n                            portletId,\\n                            message,\\n                        },\\n                    });\\n                };\\n            });\\n        });\\n        this.engine = engine;\\n        this.dspConfigured = false;\\n    }\\n    destroy() {\\n        this.process = () => false;\\n    }\\n}\\nregisterProcessor('webpd-node', WasmWorkletProcessor);\\n";

  var ASSEMBLY_SCRIPT_WASM_BINDINGS_CODE = "var AssemblyScriptWasmBindings = (function (exports) {\\n    'use strict';\\n\\n    const _proxyGetHandlerThrowIfKeyUnknown = (target, key, path) => {\\n        if (!(key in target)) {\\n            if ([\\n                'toJSON',\\n                'Symbol(Symbol.toStringTag)',\\n                'constructor',\\n                '$typeof',\\n                '$$typeof',\\n                '@@__IMMUTABLE_ITERABLE__@@',\\n                '@@__IMMUTABLE_RECORD__@@',\\n                'then',\\n            ].includes(key)) {\\n                return true;\\n            }\\n            throw new Error(\`namespace\${path ? \` <\${path.keys.join('.')}>\` : ''} doesn't know key \\"\${String(key)}\\"\`);\\n        }\\n        return false;\\n    };\\n\\n    const getFloatArrayType = (bitDepth) => bitDepth === 64 ? Float64Array : Float32Array;\\n    const proxyAsModuleWithBindings = (rawModule, bindings) => new Proxy({}, {\\n        get: (_, k) => {\\n            if (bindings.hasOwnProperty(k)) {\\n                const key = String(k);\\n                const bindingSpec = bindings[key];\\n                switch (bindingSpec.type) {\\n                    case 'raw':\\n                        if (k in rawModule) {\\n                            return rawModule[key];\\n                        }\\n                        else {\\n                            throw new Error(\`Key \${String(key)} doesn't exist in raw module\`);\\n                        }\\n                    case 'proxy':\\n                    case 'callback':\\n                        return bindingSpec.value;\\n                }\\n            }\\n            else {\\n                return undefined;\\n            }\\n        },\\n        has: function (_, k) {\\n            return k in bindings;\\n        },\\n        set: (_, k, newValue) => {\\n            if (bindings.hasOwnProperty(String(k))) {\\n                const key = String(k);\\n                const bindingSpec = bindings[key];\\n                if (bindingSpec.type === 'callback') {\\n                    bindingSpec.value = newValue;\\n                }\\n                else {\\n                    throw new Error(\`Binding key \${String(key)} is read-only\`);\\n                }\\n            }\\n            else {\\n                throw new Error(\`Key \${String(k)} is not defined in bindings\`);\\n            }\\n            return true;\\n        },\\n    });\\n    const proxyWithEngineNameMapping = (rawModule, variableNamesIndex) => proxyWithNameMapping(rawModule, {\\n        globals: variableNamesIndex.globals,\\n        io: variableNamesIndex.io,\\n    });\\n    const proxyWithNameMapping = (rawModule, variableNamesIndex) => {\\n        if (typeof variableNamesIndex === 'string') {\\n            return rawModule[variableNamesIndex];\\n        }\\n        else if (typeof variableNamesIndex === 'object') {\\n            return new Proxy(rawModule, {\\n                get: (_, k) => {\\n                    const key = String(k);\\n                    if (key in rawModule) {\\n                        return Reflect.get(rawModule, key);\\n                    }\\n                    else if (key in variableNamesIndex) {\\n                        const nextVariableNames = variableNamesIndex[key];\\n                        return proxyWithNameMapping(rawModule, nextVariableNames);\\n                    }\\n                    else if (_proxyGetHandlerThrowIfKeyUnknown(rawModule, key)) {\\n                        return undefined;\\n                    }\\n                },\\n                has: function (_, k) {\\n                    return k in rawModule || k in variableNamesIndex;\\n                },\\n                set: (_, k, value) => {\\n                    const key = String(k);\\n                    if (key in variableNamesIndex) {\\n                        const variableName = variableNamesIndex[key];\\n                        if (typeof variableName !== 'string') {\\n                            throw new Error(\`Failed to set value for key \${String(k)}: variable name is not a string\`);\\n                        }\\n                        return Reflect.set(rawModule, variableName, value);\\n                    }\\n                    else {\\n                        throw new Error(\`Key \${String(k)} is not defined in raw module\`);\\n                    }\\n                },\\n            });\\n        }\\n        else {\\n            throw new Error(\`Invalid name mapping\`);\\n        }\\n    };\\n\\n    const liftString = (rawModule, pointer) => {\\n        if (!pointer) {\\n            throw new Error('Cannot lift a null pointer');\\n        }\\n        pointer = pointer >>> 0;\\n        const end = (pointer +\\n            new Uint32Array(rawModule.memory.buffer)[(pointer - 4) >>> 2]) >>>\\n            1;\\n        const memoryU16 = new Uint16Array(rawModule.memory.buffer);\\n        let start = pointer >>> 1;\\n        let string = '';\\n        while (end - start > 1024) {\\n            string += String.fromCharCode(...memoryU16.subarray(start, (start += 1024)));\\n        }\\n        return string + String.fromCharCode(...memoryU16.subarray(start, end));\\n    };\\n    const lowerString = (rawModule, value) => {\\n        if (value == null) {\\n            throw new Error('Cannot lower a null string');\\n        }\\n        const length = value.length, pointer = rawModule.__new(length << 1, 1) >>> 0, memoryU16 = new Uint16Array(rawModule.memory.buffer);\\n        for (let i = 0; i < length; ++i)\\n            memoryU16[(pointer >>> 1) + i] = value.charCodeAt(i);\\n        return pointer;\\n    };\\n    const readTypedArray = (rawModule, constructor, pointer) => {\\n        if (!pointer) {\\n            throw new Error('Cannot lift a null pointer');\\n        }\\n        const memoryU32 = new Uint32Array(rawModule.memory.buffer);\\n        return new constructor(rawModule.memory.buffer, memoryU32[(pointer + 4) >>> 2], memoryU32[(pointer + 8) >>> 2] / constructor.BYTES_PER_ELEMENT);\\n    };\\n    const lowerFloatArray = (rawModule, bitDepth, data) => {\\n        const arrayType = getFloatArrayType(bitDepth);\\n        const arrayPointer = rawModule.globals.core.createFloatArray(data.length);\\n        const array = readTypedArray(rawModule, arrayType, arrayPointer);\\n        array.set(data);\\n        return { array, arrayPointer };\\n    };\\n    const lowerListOfFloatArrays = (rawModule, bitDepth, data) => {\\n        const arraysPointer = rawModule.globals.core.x_createListOfArrays();\\n        data.forEach((array) => {\\n            const { arrayPointer } = lowerFloatArray(rawModule, bitDepth, array);\\n            rawModule.globals.core.x_pushToListOfArrays(arraysPointer, arrayPointer);\\n        });\\n        return arraysPointer;\\n    };\\n    const readListOfFloatArrays = (rawModule, bitDepth, listOfArraysPointer) => {\\n        const listLength = rawModule.globals.core.x_getListOfArraysLength(listOfArraysPointer);\\n        const arrays = [];\\n        const arrayType = getFloatArrayType(bitDepth);\\n        for (let i = 0; i < listLength; i++) {\\n            const arrayPointer = rawModule.globals.core.x_getListOfArraysElem(listOfArraysPointer, i);\\n            arrays.push(readTypedArray(rawModule, arrayType, arrayPointer));\\n        }\\n        return arrays;\\n    };\\n\\n    const instantiateWasmModule = async (wasmBuffer, wasmImports = {}) => {\\n        const instanceAndModule = await WebAssembly.instantiate(wasmBuffer, {\\n            env: {\\n                abort: (messagePointer, _, lineNumber, columnNumber) => {\\n                    const message = liftString(wasmExports, messagePointer);\\n                    lineNumber = lineNumber;\\n                    columnNumber = columnNumber;\\n                    (() => {\\n                        throw Error(\`\${message} at \${lineNumber}:\${columnNumber}\`);\\n                    })();\\n                },\\n                seed: () => {\\n                    return (() => {\\n                        return Date.now() * Math.random();\\n                    })();\\n                },\\n                'console.log': (textPointer) => {\\n                    console.log(liftString(wasmExports, textPointer));\\n                },\\n            },\\n            ...wasmImports,\\n        });\\n        const wasmExports = instanceAndModule.instance\\n            .exports;\\n        return instanceAndModule.instance;\\n    };\\n\\n    const updateWasmInOuts = ({ refs, cache, }) => {\\n        cache.wasmOutput = readTypedArray(refs.rawModule, cache.arrayType, refs.rawModule.globals.core.x_getOutput());\\n        cache.wasmInput = readTypedArray(refs.rawModule, cache.arrayType, refs.rawModule.globals.core.x_getInput());\\n    };\\n    const createEngineLifecycleBindings = (engineContext) => {\\n        const { refs, cache, metadata } = engineContext;\\n        return {\\n            initialize: {\\n                type: 'proxy',\\n                value: (sampleRate, blockSize) => {\\n                    metadata.settings.audio.blockSize = blockSize;\\n                    metadata.settings.audio.sampleRate = sampleRate;\\n                    cache.blockSize = blockSize;\\n                    refs.rawModule.initialize(sampleRate, blockSize);\\n                    updateWasmInOuts(engineContext);\\n                },\\n            },\\n            dspLoop: {\\n                type: 'proxy',\\n                value: (input, output) => {\\n                    for (let channel = 0; channel < input.length; channel++) {\\n                        cache.wasmInput.set(input[channel], channel * cache.blockSize);\\n                    }\\n                    updateWasmInOuts(engineContext);\\n                    refs.rawModule.dspLoop();\\n                    updateWasmInOuts(engineContext);\\n                    for (let channel = 0; channel < output.length; channel++) {\\n                        output[channel].set(cache.wasmOutput.subarray(cache.blockSize * channel, cache.blockSize * (channel + 1)));\\n                    }\\n                },\\n            },\\n        };\\n    };\\n\\n    const createCommonsBindings = (engineContext) => {\\n        const { refs, cache } = engineContext;\\n        return {\\n            getArray: {\\n                type: 'proxy',\\n                value: (arrayName) => {\\n                    const arrayNamePointer = lowerString(refs.rawModule, arrayName);\\n                    const arrayPointer = refs.rawModule.globals.commons.getArray(arrayNamePointer);\\n                    return readTypedArray(refs.rawModule, cache.arrayType, arrayPointer);\\n                },\\n            },\\n            setArray: {\\n                type: 'proxy',\\n                value: (arrayName, array) => {\\n                    const stringPointer = lowerString(refs.rawModule, arrayName);\\n                    const { arrayPointer } = lowerFloatArray(refs.rawModule, cache.bitDepth, array);\\n                    refs.rawModule.globals.commons.setArray(stringPointer, arrayPointer);\\n                    updateWasmInOuts(engineContext);\\n                },\\n            },\\n        };\\n    };\\n\\n    const readMetadata = async (wasmBuffer) => {\\n        const inputImports = {};\\n        const wasmModule = WebAssembly.Module.imports(new WebAssembly.Module(wasmBuffer));\\n        wasmModule\\n            .filter((imprt) => imprt.module === 'input' && imprt.kind === 'function')\\n            .forEach((imprt) => (inputImports[imprt.name] = () => undefined));\\n        const wasmInstance = await instantiateWasmModule(wasmBuffer, {\\n            input: inputImports,\\n        });\\n        const rawModule = wasmInstance.exports;\\n        const stringPointer = rawModule.metadata.valueOf();\\n        const metadataJSON = liftString(rawModule, stringPointer);\\n        return JSON.parse(metadataJSON);\\n    };\\n\\n    const mapArray = (src, func) => {\\n        const dest = {};\\n        src.forEach((srcValue, i) => {\\n            const [key, destValue] = func(srcValue, i);\\n            dest[key] = destValue;\\n        });\\n        return dest;\\n    };\\n\\n    const liftMessage = (rawModule, messagePointer) => {\\n        const messageTokenTypesPointer = rawModule.globals.msg.x_getTokenTypes(messagePointer);\\n        const messageTokenTypes = readTypedArray(rawModule, Int32Array, messageTokenTypesPointer);\\n        const message = [];\\n        messageTokenTypes.forEach((tokenType, tokenIndex) => {\\n            if (tokenType === rawModule.globals.msg.FLOAT_TOKEN.valueOf()) {\\n                message.push(rawModule.globals.msg.readFloatToken(messagePointer, tokenIndex));\\n            }\\n            else if (tokenType === rawModule.globals.msg.STRING_TOKEN.valueOf()) {\\n                const stringPointer = rawModule.globals.msg.readStringToken(messagePointer, tokenIndex);\\n                message.push(liftString(rawModule, stringPointer));\\n            }\\n        });\\n        return message;\\n    };\\n    const lowerMessage = (rawModule, message) => {\\n        const template = message.reduce((template, value) => {\\n            if (typeof value === 'number') {\\n                template.push(rawModule.globals.msg.FLOAT_TOKEN.valueOf());\\n            }\\n            else if (typeof value === 'string') {\\n                template.push(rawModule.globals.msg.STRING_TOKEN.valueOf());\\n                template.push(value.length);\\n            }\\n            else {\\n                throw new Error(\`invalid message value \${value}\`);\\n            }\\n            return template;\\n        }, []);\\n        const templateArrayPointer = rawModule.globals.msg.x_createTemplate(template.length);\\n        const loweredTemplateArray = readTypedArray(rawModule, Int32Array, templateArrayPointer);\\n        loweredTemplateArray.set(template);\\n        const messagePointer = rawModule.globals.msg.x_create(templateArrayPointer);\\n        message.forEach((value, index) => {\\n            if (typeof value === 'number') {\\n                rawModule.globals.msg.writeFloatToken(messagePointer, index, value);\\n            }\\n            else if (typeof value === 'string') {\\n                const stringPointer = lowerString(rawModule, value);\\n                rawModule.globals.msg.writeStringToken(messagePointer, index, stringPointer);\\n            }\\n        });\\n        return messagePointer;\\n    };\\n\\n    const createIoMessageReceiversBindings = ({ metadata, refs, }) => Object.entries(metadata.settings.io.messageReceivers).reduce((bindings, [nodeId, spec]) => ({\\n        ...bindings,\\n        [nodeId]: {\\n            type: 'proxy',\\n            value: mapArray(spec, (inletId) => [\\n                inletId,\\n                (message) => {\\n                    const messagePointer = lowerMessage(refs.rawModule, message);\\n                    refs.rawModule.io.messageReceivers[nodeId][inletId](messagePointer);\\n                },\\n            ]),\\n        },\\n    }), {});\\n    const createIoMessageSendersBindings = ({ metadata, }) => Object.entries(metadata.settings.io.messageSenders).reduce((bindings, [nodeId, spec]) => ({\\n        ...bindings,\\n        [nodeId]: {\\n            type: 'proxy',\\n            value: mapArray(spec, (outletId) => [\\n                outletId,\\n                (_) => undefined,\\n            ]),\\n        },\\n    }), {});\\n    const ioMsgSendersImports = ({ metadata, refs, }) => {\\n        const wasmImports = {};\\n        const { variableNamesIndex } = metadata.compilation;\\n        Object.entries(metadata.settings.io.messageSenders).forEach(([nodeId, spec]) => {\\n            spec.forEach((outletId) => {\\n                const listenerName = variableNamesIndex.io.messageSenders[nodeId][outletId];\\n                wasmImports[listenerName] = (messagePointer) => {\\n                    const message = liftMessage(refs.rawModule, messagePointer);\\n                    refs.engine.io.messageSenders[nodeId][outletId](message);\\n                };\\n            });\\n        });\\n        return wasmImports;\\n    };\\n\\n    const createFsBindings = (engineContext) => {\\n        const { refs, cache, metadata } = engineContext;\\n        const fsExportedNames = metadata.compilation.variableNamesIndex.globals.fs;\\n        return {\\n            sendReadSoundFileResponse: {\\n                type: 'proxy',\\n                value: 'x_onReadSoundFileResponse' in fsExportedNames\\n                    ? (operationId, status, sound) => {\\n                        let soundPointer = 0;\\n                        if (sound) {\\n                            soundPointer = lowerListOfFloatArrays(refs.rawModule, cache.bitDepth, sound);\\n                        }\\n                        refs.rawModule.globals.fs.x_onReadSoundFileResponse(operationId, status, soundPointer);\\n                        updateWasmInOuts(engineContext);\\n                    }\\n                    : undefined,\\n            },\\n            sendWriteSoundFileResponse: {\\n                type: 'proxy',\\n                value: 'x_onWriteSoundFileResponse' in fsExportedNames\\n                    ? refs.rawModule.globals.fs.x_onWriteSoundFileResponse\\n                    : undefined,\\n            },\\n            sendSoundStreamData: {\\n                type: 'proxy',\\n                value: 'x_onSoundStreamData' in fsExportedNames\\n                    ? (operationId, sound) => {\\n                        const soundPointer = lowerListOfFloatArrays(refs.rawModule, cache.bitDepth, sound);\\n                        const writtenFrameCount = refs.rawModule.globals.fs.x_onSoundStreamData(operationId, soundPointer);\\n                        updateWasmInOuts(engineContext);\\n                        return writtenFrameCount;\\n                    }\\n                    : undefined,\\n            },\\n            closeSoundStream: {\\n                type: 'proxy',\\n                value: 'x_onCloseSoundStream' in fsExportedNames\\n                    ? refs.rawModule.globals.fs.x_onCloseSoundStream\\n                    : undefined,\\n            },\\n            onReadSoundFile: { type: 'callback', value: () => undefined },\\n            onWriteSoundFile: { type: 'callback', value: () => undefined },\\n            onOpenSoundReadStream: { type: 'callback', value: () => undefined },\\n            onOpenSoundWriteStream: { type: 'callback', value: () => undefined },\\n            onSoundStreamData: { type: 'callback', value: () => undefined },\\n            onCloseSoundStream: { type: 'callback', value: () => undefined },\\n        };\\n    };\\n    const createFsImports = (engineContext) => {\\n        const wasmImports = {};\\n        const { cache, metadata, refs } = engineContext;\\n        const exportedNames = metadata.compilation.variableNamesIndex.globals;\\n        if ('fs' in exportedNames) {\\n            const nameMapping = proxyWithNameMapping(wasmImports, exportedNames.fs);\\n            if ('i_readSoundFile' in exportedNames.fs) {\\n                nameMapping.i_readSoundFile = (operationId, urlPointer, infoPointer) => {\\n                    const url = liftString(refs.rawModule, urlPointer);\\n                    const info = liftMessage(refs.rawModule, infoPointer);\\n                    refs.engine.globals.fs.onReadSoundFile(operationId, url, info);\\n                };\\n            }\\n            if ('i_writeSoundFile' in exportedNames.fs) {\\n                nameMapping.i_writeSoundFile = (operationId, soundPointer, urlPointer, infoPointer) => {\\n                    const sound = readListOfFloatArrays(refs.rawModule, cache.bitDepth, soundPointer);\\n                    const url = liftString(refs.rawModule, urlPointer);\\n                    const info = liftMessage(refs.rawModule, infoPointer);\\n                    refs.engine.globals.fs.onWriteSoundFile(operationId, sound, url, info);\\n                };\\n            }\\n            if ('i_openSoundReadStream' in exportedNames.fs) {\\n                nameMapping.i_openSoundReadStream = (operationId, urlPointer, infoPointer) => {\\n                    const url = liftString(refs.rawModule, urlPointer);\\n                    const info = liftMessage(refs.rawModule, infoPointer);\\n                    updateWasmInOuts(engineContext);\\n                    refs.engine.globals.fs.onOpenSoundReadStream(operationId, url, info);\\n                };\\n            }\\n            if ('i_openSoundWriteStream' in exportedNames.fs) {\\n                nameMapping.i_openSoundWriteStream = (operationId, urlPointer, infoPointer) => {\\n                    const url = liftString(refs.rawModule, urlPointer);\\n                    const info = liftMessage(refs.rawModule, infoPointer);\\n                    refs.engine.globals.fs.onOpenSoundWriteStream(operationId, url, info);\\n                };\\n            }\\n            if ('i_sendSoundStreamData' in exportedNames.fs) {\\n                nameMapping.i_sendSoundStreamData = (operationId, blockPointer) => {\\n                    const block = readListOfFloatArrays(refs.rawModule, cache.bitDepth, blockPointer);\\n                    refs.engine.globals.fs.onSoundStreamData(operationId, block);\\n                };\\n            }\\n            if ('i_closeSoundStream' in exportedNames.fs) {\\n                nameMapping.i_closeSoundStream = (...args) => refs.engine.globals.fs.onCloseSoundStream(...args);\\n            }\\n        }\\n        return wasmImports;\\n    };\\n\\n    const createEngine = async (wasmBuffer, additionalBindings) => {\\n        const metadata = await readMetadata(wasmBuffer);\\n        const bitDepth = metadata.settings.audio.bitDepth;\\n        const arrayType = getFloatArrayType(bitDepth);\\n        const engineContext = {\\n            refs: {},\\n            metadata: metadata,\\n            cache: {\\n                wasmOutput: new arrayType(0),\\n                wasmInput: new arrayType(0),\\n                arrayType,\\n                bitDepth,\\n                blockSize: 0,\\n            },\\n        };\\n        const wasmImports = {\\n            ...createFsImports(engineContext),\\n            ...ioMsgSendersImports(engineContext),\\n        };\\n        const wasmInstance = await instantiateWasmModule(wasmBuffer, {\\n            input: wasmImports,\\n        });\\n        engineContext.refs.rawModule = proxyWithEngineNameMapping(wasmInstance.exports, metadata.compilation.variableNamesIndex);\\n        const engineBindings = createEngineBindings(engineContext);\\n        const engine = proxyAsModuleWithBindings(engineContext.refs.rawModule, {\\n            ...engineBindings,\\n            ...(additionalBindings || {}),\\n        });\\n        engineContext.refs.engine = engine;\\n        return engine;\\n    };\\n    const createEngineBindings = (engineContext) => {\\n        const { metadata, refs } = engineContext;\\n        const exportedNames = metadata.compilation.variableNamesIndex.globals;\\n        const io = {\\n            messageReceivers: proxyAsModuleWithBindings(refs.rawModule, createIoMessageReceiversBindings(engineContext)),\\n            messageSenders: proxyAsModuleWithBindings(refs.rawModule, createIoMessageSendersBindings(engineContext)),\\n        };\\n        const globalsBindings = {\\n            commons: {\\n                type: 'proxy',\\n                value: proxyAsModuleWithBindings(refs.rawModule, createCommonsBindings(engineContext)),\\n            },\\n        };\\n        if ('fs' in exportedNames) {\\n            const fs = proxyAsModuleWithBindings(refs.rawModule, createFsBindings(engineContext));\\n            globalsBindings.fs = { type: 'proxy', value: fs };\\n        }\\n        return {\\n            ...createEngineLifecycleBindings(engineContext),\\n            metadata: { type: 'proxy', value: metadata },\\n            globals: {\\n                type: 'proxy',\\n                value: proxyAsModuleWithBindings(refs.rawModule, globalsBindings),\\n            },\\n            io: { type: 'proxy', value: io },\\n        };\\n    };\\n\\n    exports.createEngine = createEngine;\\n    exports.createEngineBindings = createEngineBindings;\\n\\n    return exports;\\n\\n})({});\\n";

  var JAVA_SCRIPT_BINDINGS_CODE = "var JavaScriptBindings = (function (exports) {\\n    'use strict';\\n\\n    const _proxyGetHandlerThrowIfKeyUnknown = (target, key, path) => {\\n        if (!(key in target)) {\\n            if ([\\n                'toJSON',\\n                'Symbol(Symbol.toStringTag)',\\n                'constructor',\\n                '$typeof',\\n                '$$typeof',\\n                '@@__IMMUTABLE_ITERABLE__@@',\\n                '@@__IMMUTABLE_RECORD__@@',\\n                'then',\\n            ].includes(key)) {\\n                return true;\\n            }\\n            throw new Error(\`namespace\${path ? \` <\${path.keys.join('.')}>\` : ''} doesn't know key \\"\${String(key)}\\"\`);\\n        }\\n        return false;\\n    };\\n\\n    const getFloatArrayType = (bitDepth) => bitDepth === 64 ? Float64Array : Float32Array;\\n    const proxyAsModuleWithBindings = (rawModule, bindings) => new Proxy({}, {\\n        get: (_, k) => {\\n            if (bindings.hasOwnProperty(k)) {\\n                const key = String(k);\\n                const bindingSpec = bindings[key];\\n                switch (bindingSpec.type) {\\n                    case 'raw':\\n                        if (k in rawModule) {\\n                            return rawModule[key];\\n                        }\\n                        else {\\n                            throw new Error(\`Key \${String(key)} doesn't exist in raw module\`);\\n                        }\\n                    case 'proxy':\\n                    case 'callback':\\n                        return bindingSpec.value;\\n                }\\n            }\\n            else {\\n                return undefined;\\n            }\\n        },\\n        has: function (_, k) {\\n            return k in bindings;\\n        },\\n        set: (_, k, newValue) => {\\n            if (bindings.hasOwnProperty(String(k))) {\\n                const key = String(k);\\n                const bindingSpec = bindings[key];\\n                if (bindingSpec.type === 'callback') {\\n                    bindingSpec.value = newValue;\\n                }\\n                else {\\n                    throw new Error(\`Binding key \${String(key)} is read-only\`);\\n                }\\n            }\\n            else {\\n                throw new Error(\`Key \${String(k)} is not defined in bindings\`);\\n            }\\n            return true;\\n        },\\n    });\\n    const proxyWithEngineNameMapping = (rawModule, variableNamesIndex) => proxyWithNameMapping(rawModule, {\\n        globals: variableNamesIndex.globals,\\n        io: variableNamesIndex.io,\\n    });\\n    const proxyWithNameMapping = (rawModule, variableNamesIndex) => {\\n        if (typeof variableNamesIndex === 'string') {\\n            return rawModule[variableNamesIndex];\\n        }\\n        else if (typeof variableNamesIndex === 'object') {\\n            return new Proxy(rawModule, {\\n                get: (_, k) => {\\n                    const key = String(k);\\n                    if (key in rawModule) {\\n                        return Reflect.get(rawModule, key);\\n                    }\\n                    else if (key in variableNamesIndex) {\\n                        const nextVariableNames = variableNamesIndex[key];\\n                        return proxyWithNameMapping(rawModule, nextVariableNames);\\n                    }\\n                    else if (_proxyGetHandlerThrowIfKeyUnknown(rawModule, key)) {\\n                        return undefined;\\n                    }\\n                },\\n                has: function (_, k) {\\n                    return k in rawModule || k in variableNamesIndex;\\n                },\\n                set: (_, k, value) => {\\n                    const key = String(k);\\n                    if (key in variableNamesIndex) {\\n                        const variableName = variableNamesIndex[key];\\n                        if (typeof variableName !== 'string') {\\n                            throw new Error(\`Failed to set value for key \${String(k)}: variable name is not a string\`);\\n                        }\\n                        return Reflect.set(rawModule, variableName, value);\\n                    }\\n                    else {\\n                        throw new Error(\`Key \${String(k)} is not defined in raw module\`);\\n                    }\\n                },\\n            });\\n        }\\n        else {\\n            throw new Error(\`Invalid name mapping\`);\\n        }\\n    };\\n\\n    const createFsModule = (rawModule) => {\\n        const fsExportedNames = rawModule.metadata.compilation.variableNamesIndex.globals.fs;\\n        const fs = proxyAsModuleWithBindings(rawModule, {\\n            onReadSoundFile: { type: 'callback', value: () => undefined },\\n            onWriteSoundFile: { type: 'callback', value: () => undefined },\\n            onOpenSoundReadStream: { type: 'callback', value: () => undefined },\\n            onOpenSoundWriteStream: { type: 'callback', value: () => undefined },\\n            onSoundStreamData: { type: 'callback', value: () => undefined },\\n            onCloseSoundStream: { type: 'callback', value: () => undefined },\\n            sendReadSoundFileResponse: {\\n                type: 'proxy',\\n                value: 'x_onReadSoundFileResponse' in fsExportedNames\\n                    ? rawModule.globals.fs.x_onReadSoundFileResponse\\n                    : undefined,\\n            },\\n            sendWriteSoundFileResponse: {\\n                type: 'proxy',\\n                value: 'x_onWriteSoundFileResponse' in fsExportedNames\\n                    ? rawModule.globals.fs.x_onWriteSoundFileResponse\\n                    : undefined,\\n            },\\n            sendSoundStreamData: {\\n                type: 'proxy',\\n                value: 'x_onSoundStreamData' in fsExportedNames\\n                    ? rawModule.globals.fs.x_onSoundStreamData\\n                    : undefined,\\n            },\\n            closeSoundStream: {\\n                type: 'proxy',\\n                value: 'x_onCloseSoundStream' in fsExportedNames\\n                    ? rawModule.globals.fs.x_onCloseSoundStream\\n                    : undefined,\\n            },\\n        });\\n        if ('i_openSoundWriteStream' in fsExportedNames) {\\n            rawModule.globals.fs.i_openSoundWriteStream = (...args) => fs.onOpenSoundWriteStream(...args);\\n        }\\n        if ('i_sendSoundStreamData' in fsExportedNames) {\\n            rawModule.globals.fs.i_sendSoundStreamData = (...args) => fs.onSoundStreamData(...args);\\n        }\\n        if ('i_openSoundReadStream' in fsExportedNames) {\\n            rawModule.globals.fs.i_openSoundReadStream = (...args) => fs.onOpenSoundReadStream(...args);\\n        }\\n        if ('i_closeSoundStream' in fsExportedNames) {\\n            rawModule.globals.fs.i_closeSoundStream = (...args) => fs.onCloseSoundStream(...args);\\n        }\\n        if ('i_writeSoundFile' in fsExportedNames) {\\n            rawModule.globals.fs.i_writeSoundFile = (...args) => fs.onWriteSoundFile(...args);\\n        }\\n        if ('i_readSoundFile' in fsExportedNames) {\\n            rawModule.globals.fs.i_readSoundFile = (...args) => fs.onReadSoundFile(...args);\\n        }\\n        return fs;\\n    };\\n\\n    const createCommonsModule = (rawModule, metadata) => {\\n        const floatArrayType = getFloatArrayType(metadata.settings.audio.bitDepth);\\n        return proxyAsModuleWithBindings(rawModule, {\\n            getArray: {\\n                type: 'proxy',\\n                value: (arrayName) => rawModule.globals.commons.getArray(arrayName),\\n            },\\n            setArray: {\\n                type: 'proxy',\\n                value: (arrayName, array) => rawModule.globals.commons.setArray(arrayName, new floatArrayType(array)),\\n            },\\n        });\\n    };\\n\\n    const compileRawModule = (code) => new Function(\`\\n        \${code}\\n        return exports\\n    \`)();\\n    const createEngineBindings = (rawModule) => {\\n        const exportedNames = rawModule.metadata.compilation.variableNamesIndex.globals;\\n        const globalsBindings = {\\n            commons: {\\n                type: 'proxy',\\n                value: createCommonsModule(rawModule, rawModule.metadata),\\n            },\\n        };\\n        if ('fs' in exportedNames) {\\n            globalsBindings.fs = { type: 'proxy', value: createFsModule(rawModule) };\\n        }\\n        return {\\n            metadata: { type: 'raw' },\\n            initialize: { type: 'raw' },\\n            dspLoop: { type: 'raw' },\\n            io: { type: 'raw' },\\n            globals: {\\n                type: 'proxy',\\n                value: proxyAsModuleWithBindings(rawModule, globalsBindings),\\n            },\\n        };\\n    };\\n    const createEngine = (code, additionalBindings) => {\\n        const rawModule = compileRawModule(code);\\n        const rawModuleWithNameMapping = proxyWithEngineNameMapping(rawModule, rawModule.metadata.compilation.variableNamesIndex);\\n        return proxyAsModuleWithBindings(rawModule, {\\n            ...createEngineBindings(rawModuleWithNameMapping),\\n            ...(additionalBindings || {}),\\n        });\\n    };\\n\\n    exports.compileRawModule = compileRawModule;\\n    exports.createEngine = createEngine;\\n    exports.createEngineBindings = createEngineBindings;\\n\\n    return exports;\\n\\n})({});\\n";

  var fetchRetry$1 = function (fetch, defaults) {
    defaults = defaults || {};
    if (typeof fetch !== 'function') {
      throw new ArgumentError('fetch must be a function');
    }

    if (typeof defaults !== 'object') {
      throw new ArgumentError('defaults must be an object');
    }

    if (defaults.retries !== undefined && !isPositiveInteger(defaults.retries)) {
      throw new ArgumentError('retries must be a positive integer');
    }

    if (defaults.retryDelay !== undefined && !isPositiveInteger(defaults.retryDelay) && typeof defaults.retryDelay !== 'function') {
      throw new ArgumentError('retryDelay must be a positive integer or a function returning a positive integer');
    }

    if (defaults.retryOn !== undefined && !Array.isArray(defaults.retryOn) && typeof defaults.retryOn !== 'function') {
      throw new ArgumentError('retryOn property expects an array or function');
    }

    var baseDefaults = {
      retries: 3,
      retryDelay: 1000,
      retryOn: [],
    };

    defaults = Object.assign(baseDefaults, defaults);

    return function fetchRetry(input, init) {
      var retries = defaults.retries;
      var retryDelay = defaults.retryDelay;
      var retryOn = defaults.retryOn;

      if (init && init.retries !== undefined) {
        if (isPositiveInteger(init.retries)) {
          retries = init.retries;
        } else {
          throw new ArgumentError('retries must be a positive integer');
        }
      }

      if (init && init.retryDelay !== undefined) {
        if (isPositiveInteger(init.retryDelay) || (typeof init.retryDelay === 'function')) {
          retryDelay = init.retryDelay;
        } else {
          throw new ArgumentError('retryDelay must be a positive integer or a function returning a positive integer');
        }
      }

      if (init && init.retryOn) {
        if (Array.isArray(init.retryOn) || (typeof init.retryOn === 'function')) {
          retryOn = init.retryOn;
        } else {
          throw new ArgumentError('retryOn property expects an array or function');
        }
      }

      // eslint-disable-next-line no-undef
      return new Promise(function (resolve, reject) {
        var wrappedFetch = function (attempt) {
          // As of node 18, this is no longer needed since node comes with native support for fetch:
          /* istanbul ignore next */
          var _input =
            typeof Request !== 'undefined' && input instanceof Request
              ? input.clone()
              : input;
          fetch(_input, init)
            .then(function (response) {
              if (Array.isArray(retryOn) && retryOn.indexOf(response.status) === -1) {
                resolve(response);
              } else if (typeof retryOn === 'function') {
                try {
                  // eslint-disable-next-line no-undef
                  return Promise.resolve(retryOn(attempt, null, response))
                    .then(function (retryOnResponse) {
                      if(retryOnResponse) {
                        retry(attempt, null, response);
                      } else {
                        resolve(response);
                      }
                    }).catch(reject);
                } catch (error) {
                  reject(error);
                }
              } else {
                if (attempt < retries) {
                  retry(attempt, null, response);
                } else {
                  resolve(response);
                }
              }
            })
            .catch(function (error) {
              if (typeof retryOn === 'function') {
                try {
                  // eslint-disable-next-line no-undef
                  Promise.resolve(retryOn(attempt, error, null))
                    .then(function (retryOnResponse) {
                      if(retryOnResponse) {
                        retry(attempt, error, null);
                      } else {
                        reject(error);
                      }
                    })
                    .catch(function(error) {
                      reject(error);
                    });
                } catch(error) {
                  reject(error);
                }
              } else if (attempt < retries) {
                retry(attempt, error, null);
              } else {
                reject(error);
              }
            });
        };

        function retry(attempt, error, response) {
          var delay = (typeof retryDelay === 'function') ?
            retryDelay(attempt, error, response) : retryDelay;
          setTimeout(function () {
            wrappedFetch(++attempt);
          }, delay);
        }

        wrappedFetch(0);
      });
    };
  };

  function isPositiveInteger(value) {
    return Number.isInteger(value) && value >= 0;
  }

  function ArgumentError(message) {
    this.name = 'ArgumentError';
    this.message = message;
  }

  /*
   * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.
   *
   * This file is part of WebPd
   * (see https://github.com/sebpiq/WebPd).
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Lesser General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU Lesser General Public License for more details.
   *
   * You should have received a copy of the GNU Lesser General Public License
   * along with this program. If not, see <http://www.gnu.org/licenses/>.
   */
  const fetchRetry = fetchRetry$1(fetch);
  /**
   * Note : the audio worklet feature is available only in secure context.
   * This function will fail when used in insecure context (non-https, etc ...)
   * @see https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet
   */
  const addModule = async (context, processorCode) => {
      const blob = new Blob([processorCode], { type: 'text/javascript' });
      const workletProcessorUrl = URL.createObjectURL(blob);
      return context.audioWorklet.addModule(workletProcessorUrl);
  };
  // TODO : testing
  const fetchFile = async (url) => {
      let response;
      try {
          response = await fetchRetry(url, { retries: 3 });
      }
      catch (err) {
          throw new FileError(response.status, err.toString());
      }
      if (!response.ok) {
          const responseText = await response.text();
          throw new FileError(response.status, responseText);
      }
      return response.arrayBuffer();
  };
  const audioBufferToArray = (audioBuffer) => {
      const sound = [];
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
          sound.push(audioBuffer.getChannelData(channel));
      }
      return sound;
  };
  // TODO : testing
  const fixSoundChannelCount = (sound, targetChannelCount) => {
      if (sound.length === 0) {
          throw new Error(\`Received empty sound\`);
      }
      const floatArrayType = sound[0].constructor;
      const frameCount = sound[0].length;
      const fixedSound = sound.slice(0, targetChannelCount);
      while (sound.length < targetChannelCount) {
          fixedSound.push(new floatArrayType(frameCount));
      }
      return fixedSound;
  };
  const resolveRelativeUrl = (rootUrl, relativeUrl) => {
      return new URL(relativeUrl, rootUrl).href;
  };
  class FileError extends Error {
      constructor(status, msg) {
          super(\`Error \${status} : \${msg}\`);
      }
  }

  /*
   * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.
   *
   * This file is part of WebPd
   * (see https://github.com/sebpiq/WebPd).
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Lesser General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU Lesser General Public License for more details.
   *
   * You should have received a copy of the GNU Lesser General Public License
   * along with this program. If not, see <http://www.gnu.org/licenses/>.
   */
  // TODO : manage transferables
  class WebPdWorkletNode extends AudioWorkletNode {
      constructor(context) {
          super(context, 'webpd-node', {
              numberOfOutputs: 1,
              outputChannelCount: [2],
          });
      }
      destroy() {
          this.port.postMessage({
              type: 'destroy',
              payload: {},
          });
      }
  }
  // Concatenate WorkletProcessor code with the Wasm bindings it needs
  const WEBPD_WORKLET_PROCESSOR_CODE = ASSEMBLY_SCRIPT_WASM_BINDINGS_CODE +
      ';\\n' +
      JAVA_SCRIPT_BINDINGS_CODE +
      ';\\n' +
      WEB_PD_WORKLET_PROCESSOR_CODE;
  const registerWebPdWorkletNode = (context) => {
      return addModule(context, WEBPD_WORKLET_PROCESSOR_CODE);
  };

  /*
   * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.
   *
   * This file is part of WebPd
   * (see https://github.com/sebpiq/WebPd).
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Lesser General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU Lesser General Public License for more details.
   *
   * You should have received a copy of the GNU Lesser General Public License
   * along with this program. If not, see <http://www.gnu.org/licenses/>.
   */
  const FILES = {};
  const STREAMS = {};
  class FakeStream {
      constructor(url, sound) {
          this.url = url;
          this.sound = sound;
          this.frameCount = sound[0].length;
          this.readPosition = 0;
      }
  }
  const read = async (url) => {
      if (FILES[url]) {
          return FILES[url];
      }
      const arrayBuffer = await fetchFile(url);
      return {
          type: 'binary',
          data: arrayBuffer,
      };
  };
  // TODO : testing
  const readSound = async (url, context) => {
      let fakeFile = FILES[url] || (await read(url));
      switch (fakeFile.type) {
          case 'binary':
              const audioBuffer = await context.decodeAudioData(fakeFile.data);
              return audioBufferToArray(audioBuffer);
          case 'sound':
              // We copy the data here o it can be manipulated freely by the host.
              // e.g. if the buffer is sent as transferrable to the node we don't want the original to be transferred.
              return fakeFile.data.map((array) => array.slice());
      }
  };
  const writeSound = async (sound, url) => {
      FILES[url] = {
          type: 'sound',
          data: sound,
      };
  };
  const readStreamSound = async (operationId, url, channelCount, context) => {
      const sound = await readSound(url, context);
      STREAMS[operationId] = new FakeStream(url, fixSoundChannelCount(sound, channelCount));
      return STREAMS[operationId];
  };
  const writeStreamSound = async (operationId, url, channelCount) => {
      const emptySound = [];
      for (let channel = 0; channel < channelCount; channel++) {
          emptySound.push(new Float32Array(0));
      }
      STREAMS[operationId] = new FakeStream(url, emptySound);
      FILES[url] = {
          type: 'sound',
          data: emptySound,
      };
      return STREAMS[operationId];
  };
  const getStream = (operationId) => {
      return STREAMS[operationId];
  };
  const killStream = (operationId) => {
      console.log('KILL STREAM', operationId);
      delete STREAMS[operationId];
  };
  const pullBlock = (stream, frameCount) => {
      const block = stream.sound.map((array) => array.slice(stream.readPosition, stream.readPosition + frameCount));
      stream.readPosition += frameCount;
      return block;
  };
  const pushBlock = (stream, block) => {
      stream.sound = stream.sound.map((channelData, channel) => {
          const concatenated = new Float32Array(channelData.length + block[channel].length);
          concatenated.set(channelData);
          concatenated.set(block[channel], channelData.length);
          return concatenated;
      });
      stream.frameCount = stream.sound[0].length;
      FILES[stream.url].data = stream.sound;
  };
  var fakeFs = {
      writeSound,
      readSound,
      readStreamSound,
      writeStreamSound,
      pullBlock,
      pushBlock,
  };

  var closeSoundStream = async (_, payload, __) => {
      if (payload.functionName === 'onCloseSoundStream') {
          killStream(payload.arguments[0]);
      }
  };

  const _addPath = (parent, key, _path) => {
      const path = _ensurePath(_path);
      return {
          keys: [...path.keys, key],
          parents: [...path.parents, parent],
      };
  };
  const _ensurePath = (path) => path || {
      keys: [],
      parents: [],
  };
  const _proxySetHandlerReadOnly = () => {
      throw new Error('This Proxy is read-only.');
  };
  const _proxyGetHandlerThrowIfKeyUnknown$1 = (target, key, path) => {
      if (!(key in target)) {
          // Whitelist some fields that are undefined but accessed at
          // some point or another by our code.
          // TODO : find a better way to do this.
          if ([
              'toJSON',
              'Symbol(Symbol.toStringTag)',
              'constructor',
              '$typeof',
              '$$typeof',
              '@@__IMMUTABLE_ITERABLE__@@',
              '@@__IMMUTABLE_RECORD__@@',
              'then',
          ].includes(key)) {
              return true;
          }
          throw new Error(\`namespace\${path ? \` <\${path.keys.join('.')}>\` : ''} doesn't know key "\${String(key)}"\`);
      }
      return false;
  };
  const proxyAsAssigner = (spec, _obj, context, _path) => {
      const path = _path || { keys: [], parents: [] };
      const obj = proxyAsAssigner.ensureValue(_obj, spec, context, path);
      // If \`_path\` is provided, assign the new value to the parent object.
      if (_path) {
          const parent = _path.parents[_path.parents.length - 1];
          const key = _path.keys[_path.keys.length - 1];
          // The only case where we want to overwrite the existing value
          // is when it was a \`null\` assigned by \`LiteralDefaultNull\`, and
          // we want to set the real value instead.
          if (!(key in parent) || 'LiteralDefaultNull' in spec) {
              parent[key] = obj;
          }
      }
      // If the object is a Literal, end of the recursion.
      if ('Literal' in spec || 'LiteralDefaultNull' in spec) {
          return obj;
      }
      return new Proxy(obj, {
          get: (_, k) => {
              const key = String(k);
              let nextSpec;
              if ('Index' in spec) {
                  nextSpec = spec.Index(key, context, path);
              }
              else if ('Interface' in spec) {
                  if (!(key in spec.Interface)) {
                      throw new Error(\`Interface has no entry "\${String(key)}"\`);
                  }
                  nextSpec = spec.Interface[key];
              }
              else {
                  throw new Error('no builder');
              }
              return proxyAsAssigner(nextSpec, 
              // We use this form here instead of \`obj[key]\` specifically
              // to allow Assign to play well with \`ProtectedIndex\`, which
              // would raise an error if trying to access an undefined key.
              key in obj ? obj[key] : undefined, context, _addPath(obj, key, path));
          },
          set: _proxySetHandlerReadOnly,
      });
  };
  proxyAsAssigner.ensureValue = (_obj, spec, context, _path, _recursionPath) => {
      if ('Index' in spec) {
          return (_obj || spec.indexConstructor(context, _ensurePath(_path)));
      }
      else if ('Interface' in spec) {
          const obj = (_obj || {});
          Object.entries(spec.Interface).forEach(([key, nextSpec]) => {
              obj[key] = proxyAsAssigner.ensureValue(obj[key], nextSpec, context, _addPath(obj, key, _path), _addPath(obj, key, _recursionPath));
          });
          return obj;
      }
      else if ('Literal' in spec) {
          return (_obj || spec.Literal(context, _ensurePath(_path)));
      }
      else if ('LiteralDefaultNull' in spec) {
          if (!_recursionPath) {
              return (_obj ||
                  spec.LiteralDefaultNull(context, _ensurePath(_path)));
          }
          else {
              return (_obj || null);
          }
      }
      else {
          throw new Error('Invalid Assigner');
      }
  };
  proxyAsAssigner.Interface = (a) => ({ Interface: a });
  proxyAsAssigner.Index = (f, indexConstructor) => ({
      Index: f,
      indexConstructor: indexConstructor || (() => ({})),
  });
  proxyAsAssigner.Literal = (f) => ({
      Literal: f,
  });
  proxyAsAssigner.LiteralDefaultNull = (f) => ({ LiteralDefaultNull: f });
  // ---------------------------- proxyAsProtectedIndex ---------------------------- //
  /**
   * Helper to declare namespace objects enforcing stricter access rules.
   * Specifically, it forbids :
   * - reading an unknown property.
   * - trying to overwrite an existing property.
   */
  const proxyAsProtectedIndex = (namespace, path) => {
      return new Proxy(namespace, {
          get: (target, k) => {
              const key = String(k);
              if (_proxyGetHandlerThrowIfKeyUnknown$1(target, key, path)) {
                  return undefined;
              }
              return target[key];
          },
          set: (target, k, newValue) => {
              const key = _trimDollarKey(String(k));
              if (target.hasOwnProperty(key)) {
                  throw new Error(\`Key "\${String(key)}" is protected and cannot be overwritten.\`);
              }
              else {
                  target[key] = newValue;
              }
              return newValue;
          },
      });
  };
  const _trimDollarKey = (key) => {
      const match = /\\$(.*)/.exec(key);
      if (!match) {
          return key;
      }
      else {
          return match[1];
      }
  };

  /*
   * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.
   *
   * This file is part of WebPd
   * (see https://github.com/sebpiq/WebPd).
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Lesser General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU Lesser General Public License for more details.
   *
   * You should have received a copy of the GNU Lesser General Public License
   * along with this program. If not, see <http://www.gnu.org/licenses/>.
   */
  const getNode = (graph, nodeId) => {
      const node = graph[nodeId];
      if (node) {
          return node;
      }
      throw new Error(\`Node "\${nodeId}" not found in graph\`);
  };

  /** Helper to get node implementation or throw an error if not implemented. */
  const getNodeImplementation = (nodeImplementations, nodeType) => {
      const nodeImplementation = nodeImplementations[nodeType];
      if (!nodeImplementation) {
          throw new Error(\`node [\${nodeType}] is not implemented\`);
      }
      return {
          dependencies: [],
          ...nodeImplementation,
      };
  };

  /*
   * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.
   *
   * This file is part of WebPd
   * (see https://github.com/sebpiq/WebPd).
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Lesser General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU Lesser General Public License for more details.
   *
   * You should have received a copy of the GNU Lesser General Public License
   * along with this program. If not, see <http://www.gnu.org/licenses/>.
   */
  /** Generate an integer series from 0 to \`count\` (non-inclusive). */
  const countTo = (count) => {
      const results = [];
      for (let i = 0; i < count; i++) {
          results.push(i);
      }
      return results;
  };

  const Sequence = (content) => ({
      astType: 'Sequence',
      content: _processRawContent(_intersperse(content, countTo(content.length - 1).map(() => '\\n'))),
  });
  const ast = (strings, ...content) => _preventToString({
      astType: 'Sequence',
      content: _processRawContent(_intersperse(strings, content)),
  });
  const _processRawContent = (content) => {
      // 1. Flatten arrays and AstSequence, filter out nulls, and convert numbers to strings
      // Basically converts input to an Array<AstContent>.
      const flattenedAndFiltered = content.flatMap((element) => {
          if (typeof element === 'string') {
              return [element];
          }
          else if (typeof element === 'number') {
              return [element.toString()];
          }
          else {
              if (element === null) {
                  return [];
              }
              else if (Array.isArray(element)) {
                  return _processRawContent(_intersperse(element, countTo(element.length - 1).map(() => '\\n')));
              }
              else if (typeof element === 'object' &&
                  element.astType === 'Sequence') {
                  return element.content;
              }
              else {
                  return [element];
              }
          }
      });
      // 2. Combine adjacent strings
      const [combinedContent, remainingString] = flattenedAndFiltered.reduce(([combinedContent, currentString], element) => {
          if (typeof element === 'string') {
              return [combinedContent, currentString + element];
          }
          else {
              if (currentString.length) {
                  return [[...combinedContent, currentString, element], ''];
              }
              else {
                  return [[...combinedContent, element], ''];
              }
          }
      }, [[], '']);
      if (remainingString.length) {
          combinedContent.push(remainingString);
      }
      return combinedContent;
  };
  /**
   * Intersperse content from array1 with content from array2.
   * \`array1.length\` must be equal to \`array2.length + 1\`.
   */
  const _intersperse = (array1, array2) => {
      if (array1.length === 0) {
          return [];
      }
      return array1.slice(1).reduce((combinedContent, element, i) => {
          return combinedContent.concat([array2[i], element]);
      }, [array1[0]]);
  };
  /**
   * Prevents AST elements from being rendered as a string, as this is
   * most likely an error due to unproper use of \`ast\`.
   * Deacivated. Activate for debugging by uncommenting the line below.
   */
  const _preventToString = (element) => ({
      ...element,
      // Uncomment this to activate
      // toString: () => { throw new Error(\`Rendering element \${elemennt.astType} as string is probably an error\`) }
  });

  /*
   * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.
   *
   * This file is part of WebPd
   * (see https://github.com/sebpiq/WebPd).
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Lesser General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU Lesser General Public License for more details.
   *
   * You should have received a copy of the GNU Lesser General Public License
   * along with this program. If not, see <http://www.gnu.org/licenses/>.
   */
  // ---------------------------- VariableNamesIndex ---------------------------- //
  const NS = {
      GLOBALS: 'G',
      NODES: 'N',
      NODE_TYPES: 'NT',
      IO: 'IO',
      COLD: 'COLD',
  };
  proxyAsAssigner.Interface({
      nodes: proxyAsAssigner.Index((nodeId) => proxyAsAssigner.Interface({
          signalOuts: proxyAsAssigner.Index((portletId) => proxyAsAssigner.Literal(() => _name(NS.NODES, nodeId, 'outs', portletId))),
          messageSenders: proxyAsAssigner.Index((portletId) => proxyAsAssigner.Literal(() => _name(NS.NODES, nodeId, 'snds', portletId))),
          messageReceivers: proxyAsAssigner.Index((portletId) => proxyAsAssigner.Literal(() => _name(NS.NODES, nodeId, 'rcvs', portletId))),
          state: proxyAsAssigner.LiteralDefaultNull(() => _name(NS.NODES, nodeId, 'state')),
      })),
      nodeImplementations: proxyAsAssigner.Index((nodeType, { nodeImplementations }) => {
          const nodeImplementation = getNodeImplementation(nodeImplementations, nodeType);
          const nodeTypePrefix = (nodeImplementation.flags
              ? nodeImplementation.flags.alphaName
              : null) || nodeType;
          return proxyAsAssigner.Index((name) => proxyAsAssigner.Literal(() => _name(NS.NODE_TYPES, nodeTypePrefix, name)));
      }),
      globals: proxyAsAssigner.Index((ns) => proxyAsAssigner.Index((name) => {
          if (['fs'].includes(ns)) {
              return proxyAsAssigner.Literal(() => _name(NS.GLOBALS, ns, name));
              // We don't prefix stdlib core module, because these are super
              // basic functions that are always included in the global scope.
          }
          else if (ns === 'core') {
              return proxyAsAssigner.Literal(() => name);
          }
          else {
              return proxyAsAssigner.Literal(() => _name(NS.GLOBALS, ns, name));
          }
      })),
      io: proxyAsAssigner.Interface({
          messageReceivers: proxyAsAssigner.Index((nodeId) => proxyAsAssigner.Index((inletId) => proxyAsAssigner.Literal(() => _name(NS.IO, 'rcv', nodeId, inletId)))),
          messageSenders: proxyAsAssigner.Index((nodeId) => proxyAsAssigner.Index((outletId) => proxyAsAssigner.Literal(() => _name(NS.IO, 'snd', nodeId, outletId)))),
      }),
      coldDspGroups: proxyAsAssigner.Index((groupId) => proxyAsAssigner.Literal(() => _name(NS.COLD, groupId))),
  });
  // ---------------------------- PrecompiledCode ---------------------------- //
  proxyAsAssigner.Interface({
      graph: proxyAsAssigner.Literal((_, path) => ({
          fullTraversal: [],
          hotDspGroup: {
              traversal: [],
              outNodesIds: [],
          },
          coldDspGroups: proxyAsProtectedIndex({}, path),
      })),
      nodeImplementations: proxyAsAssigner.Index((nodeType, { nodeImplementations }) => proxyAsAssigner.Literal(() => ({
          nodeImplementation: getNodeImplementation(nodeImplementations, nodeType),
          stateClass: null,
          core: null,
      })), (_, path) => proxyAsProtectedIndex({}, path)),
      nodes: proxyAsAssigner.Index((nodeId, { graph }) => proxyAsAssigner.Literal(() => ({
          nodeType: getNode(graph, nodeId).type,
          messageReceivers: {},
          messageSenders: {},
          signalOuts: {},
          signalIns: {},
          initialization: ast \`\`,
          dsp: {
              loop: ast \`\`,
              inlets: {},
          },
          state: null,
      })), (_, path) => proxyAsProtectedIndex({}, path)),
      dependencies: proxyAsAssigner.Literal(() => ({
          imports: [],
          exports: [],
          ast: Sequence([]),
      })),
      io: proxyAsAssigner.Interface({
          messageReceivers: proxyAsAssigner.Index((_) => proxyAsAssigner.Literal((_, path) => proxyAsProtectedIndex({}, path)), (_, path) => proxyAsProtectedIndex({}, path)),
          messageSenders: proxyAsAssigner.Index((_) => proxyAsAssigner.Literal((_, path) => proxyAsProtectedIndex({}, path)), (_, path) => proxyAsProtectedIndex({}, path)),
      }),
  });
  // ---------------------------- MISC ---------------------------- //
  const _name = (...parts) => parts.map(assertValidNamePart).join('_');
  const assertValidNamePart = (namePart) => {
      const isInvalid = !VALID_NAME_PART_REGEXP.exec(namePart);
      if (isInvalid) {
          throw new Error(\`Invalid variable name for code generation "\${namePart}"\`);
      }
      return namePart;
  };
  const VALID_NAME_PART_REGEXP = /^[a-zA-Z0-9_]+$/;

  /*
   * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.
   *
   * This file is part of WebPd
   * (see https://github.com/sebpiq/WebPd).
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Lesser General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU Lesser General Public License for more details.
   *
   * You should have received a copy of the GNU Lesser General Public License
   * along with this program. If not, see <http://www.gnu.org/licenses/>.
   */
  const FS_OPERATION_SUCCESS = 0;
  const FS_OPERATION_FAILURE = 1;

  /*
   * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.
   *
   * This file is part of WebPd
   * (see https://github.com/sebpiq/WebPd).
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Lesser General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU Lesser General Public License for more details.
   *
   * You should have received a copy of the GNU Lesser General Public License
   * along with this program. If not, see <http://www.gnu.org/licenses/>.
   */
  var readSoundFile = async (node, payload, settings) => {
      if (payload.functionName === 'onReadSoundFile') {
          const [operationId, url, [channelCount]] = payload.arguments;
          const absoluteUrl = resolveRelativeUrl(settings.rootUrl, url);
          let operationStatus = FS_OPERATION_SUCCESS;
          let sound = null;
          try {
              sound = await fakeFs.readSound(absoluteUrl, node.context);
          }
          catch (err) {
              operationStatus = FS_OPERATION_FAILURE;
              console.error(err);
          }
          if (sound) {
              sound = fixSoundChannelCount(sound, channelCount);
          }
          node.port.postMessage({
              type: 'fs',
              payload: {
                  functionName: 'sendReadSoundFileResponse',
                  arguments: [operationId, operationStatus, sound],
              },
          }, 
          // Add as transferables to avoid copies between threads
          sound.map((array) => array.buffer));
      }
      else if (payload.functionName === 'sendReadSoundFileResponse_return') ;
  };

  /*
   * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.
   *
   * This file is part of WebPd
   * (see https://github.com/sebpiq/WebPd).
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Lesser General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU Lesser General Public License for more details.
   *
   * You should have received a copy of the GNU Lesser General Public License
   * along with this program. If not, see <http://www.gnu.org/licenses/>.
   */
  const BUFFER_HIGH = 10 * 44100;
  const BUFFER_LOW = BUFFER_HIGH / 2;
  var readSoundStream = async (node, payload, settings) => {
      if (payload.functionName === 'onOpenSoundReadStream') {
          const [operationId, url, [channelCount]] = payload.arguments;
          try {
              const absoluteUrl = resolveRelativeUrl(settings.rootUrl, url);
              await fakeFs.readStreamSound(operationId, absoluteUrl, channelCount, node.context);
          }
          catch (err) {
              console.error(err);
              node.port.postMessage({
                  type: 'fs',
                  payload: {
                      functionName: 'closeSoundStream',
                      arguments: [operationId, FS_OPERATION_FAILURE],
                  },
              });
              return;
          }
          streamLoop(node, operationId, 0);
      }
      else if (payload.functionName === 'sendSoundStreamData_return') {
          const stream = getStream(payload.operationId);
          if (!stream) {
              throw new Error(\`unknown stream \${payload.operationId}\`);
          }
          streamLoop(node, payload.operationId, payload.returned);
      }
      else if (payload.functionName === 'closeSoundStream_return') {
          const stream = getStream(payload.operationId);
          if (stream) {
              killStream(payload.operationId);
          }
      }
  };
  const streamLoop = (node, operationId, framesAvailableInEngine) => {
      const sampleRate = node.context.sampleRate;
      const secondsToThreshold = Math.max(framesAvailableInEngine - BUFFER_LOW, 10) / sampleRate;
      const framesToSend = BUFFER_HIGH -
          (framesAvailableInEngine - secondsToThreshold * sampleRate);
      setTimeout(() => {
          const stream = getStream(operationId);
          if (!stream) {
              console.log(\`stream \${operationId} was maybe closed\`);
              return;
          }
          if (stream.readPosition < stream.frameCount) {
              const block = pullBlock(stream, framesToSend);
              node.port.postMessage({
                  type: 'fs',
                  payload: {
                      functionName: 'sendSoundStreamData',
                      arguments: [operationId, block],
                  },
              }, 
              // Add as transferables to avoid copies between threads
              block.map((array) => array.buffer));
          }
          else {
              node.port.postMessage({
                  type: 'fs',
                  payload: {
                      functionName: 'closeSoundStream',
                      arguments: [operationId, FS_OPERATION_SUCCESS],
                  },
              });
          }
      }, secondsToThreshold * 1000);
  };

  /*
   * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.
   *
   * This file is part of WebPd
   * (see https://github.com/sebpiq/WebPd).
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Lesser General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU Lesser General Public License for more details.
   *
   * You should have received a copy of the GNU Lesser General Public License
   * along with this program. If not, see <http://www.gnu.org/licenses/>.
   */
  var writeSoundFile = async (node, payload, settings) => {
      if (payload.functionName === 'onWriteSoundFile') {
          const [operationId, sound, url, [channelCount]] = payload.arguments;
          const fixedSound = fixSoundChannelCount(sound, channelCount);
          const absoluteUrl = resolveRelativeUrl(settings.rootUrl, url);
          await fakeFs.writeSound(fixedSound, absoluteUrl);
          let operationStatus = FS_OPERATION_SUCCESS;
          node.port.postMessage({
              type: 'fs',
              payload: {
                  functionName: 'sendWriteSoundFileResponse',
                  arguments: [operationId, operationStatus],
              },
          });
      }
      else if (payload.functionName === 'sendWriteSoundFileResponse_return') ;
  };

  /*
   * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.
   *
   * This file is part of WebPd
   * (see https://github.com/sebpiq/WebPd).
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Lesser General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU Lesser General Public License for more details.
   *
   * You should have received a copy of the GNU Lesser General Public License
   * along with this program. If not, see <http://www.gnu.org/licenses/>.
   */
  var writeSoundStream = async (_, payload, settings) => {
      if (payload.functionName === 'onOpenSoundWriteStream') {
          const [operationId, url, [channelCount]] = payload.arguments;
          const absoluteUrl = resolveRelativeUrl(settings.rootUrl, url);
          await fakeFs.writeStreamSound(operationId, absoluteUrl, channelCount);
      }
      else if (payload.functionName === 'onSoundStreamData') {
          const [operationId, sound] = payload.arguments;
          const stream = getStream(operationId);
          if (!stream) {
              throw new Error(\`unknown stream \${operationId}\`);
          }
          pushBlock(stream, sound);
      }
      else if (payload.functionName === 'closeSoundStream_return') {
          const stream = getStream(payload.operationId);
          if (stream) {
              killStream(payload.operationId);
          }
      }
  };

  var index = async (node, messageEvent, settings) => {
      const message = messageEvent.data;
      if (message.type !== 'fs') {
          throw new Error(\`Unknown message type from node \${message.type}\`);
      }
      const { payload } = message;
      if (payload.functionName === 'onReadSoundFile' ||
          payload.functionName === 'sendReadSoundFileResponse_return') {
          readSoundFile(node, payload, settings);
      }
      else if (payload.functionName === 'onOpenSoundReadStream' ||
          payload.functionName === 'sendSoundStreamData_return') {
          readSoundStream(node, payload, settings);
      }
      else if (payload.functionName === 'onWriteSoundFile' ||
          payload.functionName === 'sendWriteSoundFileResponse_return') {
          writeSoundFile(node, payload, settings);
      }
      else if (payload.functionName === 'onOpenSoundWriteStream' ||
          payload.functionName === 'onSoundStreamData') {
          writeSoundStream(node, payload, settings);
      }
      else if (payload.functionName === 'closeSoundStream_return') {
          writeSoundStream(node, payload, settings);
          readSoundStream(node, payload, settings);
      }
      else if (payload.functionName === 'onCloseSoundStream') {
          closeSoundStream(node, payload);
      }
      else {
          throw new Error(\`Unknown callback \${payload.functionName}\`);
      }
  };

  var initialize = (...args) => {
      return registerWebPdWorkletNode(...args);
  };

  const urlDirName = (url) => {
      if (isExternalUrl(url)) {
          return new URL('.', url).href;
      }
      else {
          return new URL('.', new URL(url, document.URL).href).href;
      }
  };
  const isExternalUrl = (urlString) => {
      try {
          const url = new URL(urlString);
          if (url.origin !== new URL(document.URL, document.baseURI).origin) {
              return true;
          }
      }
      catch (_e) {
          new URL(urlString, document.baseURI);
      }
      return false;
  };

  const _proxyGetHandlerThrowIfKeyUnknown = (target, key, path) => {
      if (!(key in target)) {
          // Whitelist some fields that are undefined but accessed at
          // some point or another by our code.
          // TODO : find a better way to do this.
          if ([
              'toJSON',
              'Symbol(Symbol.toStringTag)',
              'constructor',
              '$typeof',
              '$$typeof',
              '@@__IMMUTABLE_ITERABLE__@@',
              '@@__IMMUTABLE_RECORD__@@',
              'then',
          ].includes(key)) {
              return true;
          }
          throw new Error(\`namespace\${path ? \` <\${path.keys.join('.')}>\` : ''} doesn't know key "\${String(key)}"\`);
      }
      return false;
  };

  /*
   * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.
   *
   * This file is part of WebPd
   * (see https://github.com/sebpiq/WebPd).
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Lesser General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU Lesser General Public License for more details.
   *
   * You should have received a copy of the GNU Lesser General Public License
   * along with this program. If not, see <http://www.gnu.org/licenses/>.
   */
  // NOTE : not necessarily the most logical place to put this function, but we need it here
  // cause it's imported by the bindings.
  const getFloatArrayType = (bitDepth) => bitDepth === 64 ? Float64Array : Float32Array;
  const proxyAsModuleWithBindings = (rawModule, bindings) => 
  // Use empty object on proxy cause proxy cannot redefine access of member of its target,
  // which causes issues for example for WebAssembly exports.
  // See : https://stackoverflow.com/questions/75148897/get-on-proxy-property-items-is-a-read-only-and-non-configurable-data-proper
  new Proxy({}, {
      get: (_, k) => {
          if (bindings.hasOwnProperty(k)) {
              const key = String(k);
              const bindingSpec = bindings[key];
              switch (bindingSpec.type) {
                  case 'raw':
                      // Cannot use hasOwnProperty here cause not defined in wasm exports object
                      if (k in rawModule) {
                          return rawModule[key];
                      }
                      else {
                          throw new Error(\`Key \${String(key)} doesn't exist in raw module\`);
                      }
                  case 'proxy':
                  case 'callback':
                      return bindingSpec.value;
              }
              // We need to return undefined here for compatibility with various APIs
              // which inspect object's attributes.
          }
          else {
              return undefined;
          }
      },
      has: function (_, k) {
          return k in bindings;
      },
      set: (_, k, newValue) => {
          if (bindings.hasOwnProperty(String(k))) {
              const key = String(k);
              const bindingSpec = bindings[key];
              if (bindingSpec.type === 'callback') {
                  bindingSpec.value = newValue;
              }
              else {
                  throw new Error(\`Binding key \${String(key)} is read-only\`);
              }
          }
          else {
              throw new Error(\`Key \${String(k)} is not defined in bindings\`);
          }
          return true;
      },
  });
  /**
   * Reverse-maps exported variable names from \`rawModule\` according to the mapping defined
   * in \`variableNamesIndex\`.
   *
   * For example with :
   *
   * \`\`\`
   * const variableNamesIndex = {
   *     globals: {
   *         // ...
   *         fs: {
   *             // ...
   *             readFile: 'g_fs_readFile'
   *         },
   *     }
   * }
   * \`\`\`
   *
   * The function \`g_fs_readFile\` (if it is exported properly by the raw module), will then
   * be available on the returned object at path \`.globals.fs.readFile\`.
   */
  const proxyWithEngineNameMapping = (rawModule, variableNamesIndex) => proxyWithNameMapping(rawModule, {
      globals: variableNamesIndex.globals,
      io: variableNamesIndex.io,
  });
  const proxyWithNameMapping = (rawModule, variableNamesIndex) => {
      if (typeof variableNamesIndex === 'string') {
          return rawModule[variableNamesIndex];
      }
      else if (typeof variableNamesIndex === 'object') {
          return new Proxy(rawModule, {
              get: (_, k) => {
                  const key = String(k);
                  if (key in rawModule) {
                      return Reflect.get(rawModule, key);
                  }
                  else if (key in variableNamesIndex) {
                      const nextVariableNames = variableNamesIndex[key];
                      return proxyWithNameMapping(rawModule, nextVariableNames);
                  }
                  else if (_proxyGetHandlerThrowIfKeyUnknown(rawModule, key)) {
                      return undefined;
                  }
              },
              has: function (_, k) {
                  return k in rawModule || k in variableNamesIndex;
              },
              set: (_, k, value) => {
                  const key = String(k);
                  if (key in variableNamesIndex) {
                      const variableName = variableNamesIndex[key];
                      if (typeof variableName !== 'string') {
                          throw new Error(\`Failed to set value for key \${String(k)}: variable name is not a string\`);
                      }
                      return Reflect.set(rawModule, variableName, value);
                  }
                  else {
                      throw new Error(\`Key \${String(k)} is not defined in raw module\`);
                  }
              },
          });
      }
      else {
          throw new Error(\`Invalid name mapping\`);
      }
  };

  /*
   * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.
   *
   * This file is part of WebPd
   * (see https://github.com/sebpiq/WebPd).
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Lesser General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU Lesser General Public License for more details.
   *
   * You should have received a copy of the GNU Lesser General Public License
   * along with this program. If not, see <http://www.gnu.org/licenses/>.
   */
  /** @copyright Assemblyscript ESM bindings */
  const liftString = (rawModule, pointer) => {
      if (!pointer) {
          throw new Error('Cannot lift a null pointer');
      }
      pointer = pointer >>> 0;
      const end = (pointer +
          new Uint32Array(rawModule.memory.buffer)[(pointer - 4) >>> 2]) >>>
          1;
      const memoryU16 = new Uint16Array(rawModule.memory.buffer);
      let start = pointer >>> 1;
      let string = '';
      while (end - start > 1024) {
          string += String.fromCharCode(...memoryU16.subarray(start, (start += 1024)));
      }
      return string + String.fromCharCode(...memoryU16.subarray(start, end));
  };

  /*
   * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.
   *
   * This file is part of WebPd
   * (see https://github.com/sebpiq/WebPd).
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Lesser General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU Lesser General Public License for more details.
   *
   * You should have received a copy of the GNU Lesser General Public License
   * along with this program. If not, see <http://www.gnu.org/licenses/>.
   */
  // REF : Assemblyscript ESM bindings
  const instantiateWasmModule = async (wasmBuffer, wasmImports = {}) => {
      const instanceAndModule = await WebAssembly.instantiate(wasmBuffer, {
          env: {
              abort: (messagePointer, 
              // filename, not useful because we compile everything to a single string
              _, lineNumber, columnNumber) => {
                  const message = liftString(wasmExports, messagePointer);
                  lineNumber = lineNumber;
                  columnNumber = columnNumber;
                  (() => {
                      // @external.js
                      throw Error(\`\${message} at \${lineNumber}:\${columnNumber}\`);
                  })();
              },
              seed: () => {
                  return (() => {
                      return Date.now() * Math.random();
                  })();
              },
              'console.log': (textPointer) => {
                  console.log(liftString(wasmExports, textPointer));
              },
          },
          ...wasmImports,
      });
      const wasmExports = instanceAndModule.instance
          .exports;
      return instanceAndModule.instance;
  };

  const readMetadata$2 = async (wasmBuffer) => {
      // In order to read metadata, we need to introspect the module to get the imports
      const inputImports = {};
      const wasmModule = WebAssembly.Module.imports(new WebAssembly.Module(wasmBuffer));
      // Then we generate dummy functions to be able to instantiate the module
      wasmModule
          .filter((imprt) => imprt.module === 'input' && imprt.kind === 'function')
          .forEach((imprt) => (inputImports[imprt.name] = () => undefined));
      const wasmInstance = await instantiateWasmModule(wasmBuffer, {
          input: inputImports,
      });
      // Finally, once the module instantiated, we read the metadata
      const rawModule = wasmInstance.exports;
      const stringPointer = rawModule.metadata.valueOf();
      const metadataJSON = liftString(rawModule, stringPointer);
      return JSON.parse(metadataJSON);
  };

  const createFsModule = (rawModule) => {
      const fsExportedNames = rawModule.metadata.compilation.variableNamesIndex.globals.fs;
      const fs = proxyAsModuleWithBindings(rawModule, {
          onReadSoundFile: { type: 'callback', value: () => undefined },
          onWriteSoundFile: { type: 'callback', value: () => undefined },
          onOpenSoundReadStream: { type: 'callback', value: () => undefined },
          onOpenSoundWriteStream: { type: 'callback', value: () => undefined },
          onSoundStreamData: { type: 'callback', value: () => undefined },
          onCloseSoundStream: { type: 'callback', value: () => undefined },
          sendReadSoundFileResponse: {
              type: 'proxy',
              value: 'x_onReadSoundFileResponse' in fsExportedNames
                  ? rawModule.globals.fs.x_onReadSoundFileResponse
                  : undefined,
          },
          sendWriteSoundFileResponse: {
              type: 'proxy',
              value: 'x_onWriteSoundFileResponse' in fsExportedNames
                  ? rawModule.globals.fs.x_onWriteSoundFileResponse
                  : undefined,
          },
          // should register the operation success { bitDepth: 32, target: 'javascript' }
          sendSoundStreamData: {
              type: 'proxy',
              value: 'x_onSoundStreamData' in fsExportedNames
                  ? rawModule.globals.fs.x_onSoundStreamData
                  : undefined,
          },
          closeSoundStream: {
              type: 'proxy',
              value: 'x_onCloseSoundStream' in fsExportedNames
                  ? rawModule.globals.fs.x_onCloseSoundStream
                  : undefined,
          },
      });
      if ('i_openSoundWriteStream' in fsExportedNames) {
          rawModule.globals.fs.i_openSoundWriteStream = (...args) => fs.onOpenSoundWriteStream(...args);
      }
      if ('i_sendSoundStreamData' in fsExportedNames) {
          rawModule.globals.fs.i_sendSoundStreamData = (...args) => fs.onSoundStreamData(...args);
      }
      if ('i_openSoundReadStream' in fsExportedNames) {
          rawModule.globals.fs.i_openSoundReadStream = (...args) => fs.onOpenSoundReadStream(...args);
      }
      if ('i_closeSoundStream' in fsExportedNames) {
          rawModule.globals.fs.i_closeSoundStream = (...args) => fs.onCloseSoundStream(...args);
      }
      if ('i_writeSoundFile' in fsExportedNames) {
          rawModule.globals.fs.i_writeSoundFile = (...args) => fs.onWriteSoundFile(...args);
      }
      if ('i_readSoundFile' in fsExportedNames) {
          rawModule.globals.fs.i_readSoundFile = (...args) => fs.onReadSoundFile(...args);
      }
      return fs;
  };

  const createCommonsModule = (rawModule, metadata) => {
      const floatArrayType = getFloatArrayType(metadata.settings.audio.bitDepth);
      return proxyAsModuleWithBindings(rawModule, {
          getArray: {
              type: 'proxy',
              value: (arrayName) => rawModule.globals.commons.getArray(arrayName),
          },
          setArray: {
              type: 'proxy',
              value: (arrayName, array) => rawModule.globals.commons.setArray(arrayName, new floatArrayType(array)),
          },
      });
  };

  /*
   * Copyright (c) 2022-2023 S\xE9bastien Piquemal <sebpiq@protonmail.com>, Chris McCormick.
   *
   * This file is part of WebPd
   * (see https://github.com/sebpiq/WebPd).
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Lesser General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU Lesser General Public License for more details.
   *
   * You should have received a copy of the GNU Lesser General Public License
   * along with this program. If not, see <http://www.gnu.org/licenses/>.
   */
  /**
   * These bindings enable easier interaction with modules generated with our JavaScript compilation.
   * For example : instantiation, passing data back and forth, etc ...
   *
   * **Warning** : These bindings are compiled with rollup as a standalone JS module for inclusion in other libraries.
   * In consequence, they are meant to be kept lightweight, and should avoid importing dependencies.
   *
   * @module
   */
  const compileRawModule = (code) => new Function(\`
        \${code}
        return exports
    \`)();
  const createEngineBindings = (rawModule) => {
      const exportedNames = rawModule.metadata.compilation.variableNamesIndex.globals;
      const globalsBindings = {
          commons: {
              type: 'proxy',
              value: createCommonsModule(rawModule, rawModule.metadata),
          },
      };
      if ('fs' in exportedNames) {
          globalsBindings.fs = { type: 'proxy', value: createFsModule(rawModule) };
      }
      return {
          metadata: { type: 'raw' },
          initialize: { type: 'raw' },
          dspLoop: { type: 'raw' },
          io: { type: 'raw' },
          globals: {
              type: 'proxy',
              value: proxyAsModuleWithBindings(rawModule, globalsBindings),
          },
      };
  };
  const createEngine = (code, additionalBindings) => {
      const rawModule = compileRawModule(code);
      const rawModuleWithNameMapping = proxyWithEngineNameMapping(rawModule, rawModule.metadata.compilation.variableNamesIndex);
      return proxyAsModuleWithBindings(rawModule, {
          ...createEngineBindings(rawModuleWithNameMapping),
          ...(additionalBindings || {}),
      });
  };

  const readMetadata$1 = async (target, compiled) => {
      switch (target) {
          case 'assemblyscript':
              return readMetadata$2(compiled);
          case 'javascript':
              return createEngine(compiled).metadata;
      }
  };

  const defaultSettingsForRun = (patchUrl, messageSender) => {
      const rootUrl = urlDirName(patchUrl);
      return {
          messageHandler: (node, messageEvent) => {
              const message = messageEvent.data;
              switch (message.type) {
                  case 'fs':
                      return index(node, messageEvent, { rootUrl });
                  case 'io:messageSender':
                      if (messageSender) {
                          messageSender(message.payload.nodeId, message.payload.portletId, message.payload.message);
                      }
                      return null;
                  default:
                      return null;
              }
          },
      };
  };
  const readMetadata = (compiledPatch) => {
      if (typeof compiledPatch === 'string') {
          return readMetadata$1('javascript', compiledPatch);
      }
      else {
          return readMetadata$1('assemblyscript', compiledPatch);
      }
  };

  var run = async (audioContext, compiledPatch, settings) => {
      const { messageHandler } = settings;
      const webpdNode = new WebPdWorkletNode(audioContext);
      webpdNode.port.onmessage = (msg) => messageHandler(webpdNode, msg);
      if (typeof compiledPatch === 'string') {
          webpdNode.port.postMessage({
              type: 'code:JS',
              payload: {
                  jsCode: compiledPatch,
              },
          });
      }
      else {
          webpdNode.port.postMessage({
              type: 'code:WASM',
              payload: {
                  wasmBuffer: compiledPatch,
              },
          });
      }
      return webpdNode;
  };

  exports.defaultSettingsForRun = defaultSettingsForRun;
  exports.initialize = initialize;
  exports.readMetadata = readMetadata;
  exports.run = run;

  return exports;

})({});
`;var vl=/\$(\d+)/,De=(e,t)=>{let n=e.patches[t];if(!n)throw new Error(`Patch ${t} not found`);return n},ce=e=>{let t=e.patches[e.rootPatchId];if(!t)throw new Error("Could not resolve root patch");return t},Sn=(e,t)=>{let n=e.nodes[t];if(!n)throw new Error(`Pd node ${t} not found in patch ${e.id}`);return n},Ue=(e,t)=>{let n=e[t];return n?n.aliasTo?Ue(e,n.aliasTo):{nodeBuilder:n,nodeType:t}:null},$n=(e,t)=>{let n=parseInt(t.id);if(isNaN(n))throw new Error("Invalid patch id");let r=[n,...t.args],a=new RegExp(vl,"g"),o;for(;o=a.exec(e);){let i=parseInt(o[1],10),l=0<=i&&i<r.length;if(o[0]===e)return l?r[i]:void 0;l&&(e=e.replace(o[0],r[i].toString()))}return e},In=(e,t)=>{let n=$n(t[0],e),r=typeof t[1]=="string"?$n(t[1],e):t[1];return[(n===void 0?"":n).toString(),r===void 0?0:r,t[2]]},gt=(e,t)=>t.map(n=>typeof n=="string"?$n(n,e):n);var Dr=async(e,t,n)=>{let[r,a]=Ur({patches:{},arrays:{},rootPatchId:e.rootPatchId},e),o={pd:a,nodeBuilders:t,abstractions:{},errors:{},warnings:{},abstractionLoader:n},i=ce(o.pd);return Object.values(o.pd.arrays).forEach(d=>d.args=In(i,d.args)),await bn(o,i,i,r),Object.keys(o.errors).length?{status:1,pd:o.pd,errors:o.errors,warnings:o.warnings}:{status:0,pd:o.pd,abstractions:o.abstractions,warnings:o.warnings}},bn=async(e,t,n,r)=>{let{pd:a,abstractionLoader:o,errors:i,warnings:l}=e;n.nodes={...n.nodes};for(let d of Object.values(n.nodes)){if(i.hasOwnProperty(d.type))continue;if(d.nodeClass==="subpatch"){d=n.nodes[d.id]={...d,patchId:wn(r.patches,d.patchId)},await bn(e,t,De(a,d.patchId),r);continue}else if(d.nodeClass==="array"){d=n.nodes[d.id]={...d,arrayId:wn(r.arrays,d.arrayId)};continue}if(Ue(e.nodeBuilders,d.type)!==null)continue;let p=await El(e,d.type,o);if(p.parsingWarnings&&(l[d.type]=p.parsingWarnings),p.status===1){let{status:x,parsingWarnings:k,...E}=p;i[d.type]=E;continue}let[m,$]=Ur(a,p.pd),M=ce($);d=n.nodes[d.id]={...d,args:gt(t,d.args),nodeClass:"subpatch",patchId:M.id,type:"pd"},M.args=d.args,Object.values($.arrays).forEach(x=>x.args=In(M,x.args)),a.patches={...a.patches,...$.patches},a.arrays={...a.arrays,...$.arrays},await bn(e,M,M,m)}},El=async(e,t,n)=>{if(!e.abstractions[t]){let r=await n(t);return r.status===0&&(e.abstractions[t]=r.pd),r}return{status:0,pd:e.abstractions[t]}},wn=(e,t)=>{let n=e.get(t);if(n===void 0)throw new Error(`Could not resolve ${t}`);return n},Ur=(e,t)=>{let n={patches:{},arrays:{},rootPatchId:t.rootPatchId},r={patches:new Map,arrays:new Map},a=Object.keys(e.patches);a=a.length?a:["-1"];let o=Object.keys(e.arrays);o=o.length?o:["-1"];let i=Math.max(...a.map(d=>parseInt(d)))+1,l=Math.max(...o.map(d=>parseInt(d)))+1;return Object.entries(t.patches).forEach(([d,p])=>{let m=`${i++}`;r.patches.set(d,m),n.patches[m]={...p,id:m}}),Object.entries(t.arrays).forEach(([d,p])=>{let m=`${l++}`;r.arrays.set(d,m),n.arrays[m]={...p,id:m}}),n.rootPatchId=wn(r.patches,n.rootPatchId),[r,n]};var tt={translateArgs:()=>({}),build:()=>({inlets:{},outlets:{}})},yt={pd:tt,inlet:tt,outlet:tt,"inlet~":tt,"outlet~":tt};var G=e=>{if(typeof e!="number")throw new ke(`${e} is not a number`);return e},Tn=e=>{if(typeof e!="string")throw new ke(`${e} is not a string`);return e},I=e=>e!==void 0?G(e):void 0,_=e=>e!==void 0?Tn(e):void 0,ke=class extends Error{};var L=e=>{let t=[];for(let n=0;n<e;n++)t.push(n);return t},A=(e,t)=>{let n={};return e.forEach((r,a)=>{let[o,i]=t(r,a);n[o]=i}),n},$t=(...e)=>{let t=e.find(([n])=>n);if(!t)throw new Error("no route found");return t[1]};var s=(e,t,n)=>Be({astType:"Var",name:t,type:e,value:n!==void 0?Br(n):void 0}),h=(e,t,n)=>Be({astType:"ConstVar",name:t,type:e,value:Br(n)}),u=(e,t=[],n="void")=>(r,...a)=>Be({astType:"Func",name:e,args:t,returnType:n,body:c(r,...a)}),f=(e=[],t="void")=>(n,...r)=>Be({astType:"Func",name:null,args:e,returnType:t,body:c(n,...r)}),y=(e,t)=>Be({astType:"Class",name:e,members:t}),g=e=>({astType:"Sequence",content:xn(_n(e,L(e.length-1).map(()=>`
`)))}),c=(e,...t)=>Be({astType:"Sequence",content:xn(_n(e,t))}),xn=e=>{let t=e.flatMap(a=>typeof a=="string"?[a]:typeof a=="number"?[a.toString()]:a===null?[]:Array.isArray(a)?xn(_n(a,L(a.length-1).map(()=>`
`))):typeof a=="object"&&a.astType==="Sequence"?a.content:[a]),[n,r]=t.reduce(([a,o],i)=>typeof i=="string"?[a,o+i]:o.length?[[...a,o,i],""]:[[...a,i],""],[[],""]);return r.length&&n.push(r),n},_n=(e,t)=>e.length===0?[]:e.slice(1).reduce((n,r,a)=>n.concat([t[a],r]),[e[0]]),Be=e=>({...e}),Br=e=>typeof e=="number"?g([e.toString()]):typeof e=="string"?g([e]):e;var St={translateArgs:e=>({channelCount:G(e.args[0])}),build:e=>({inlets:A(L(e.channelCount),t=>[`${t}`,{type:"signal",id:`${t}`}]),outlets:{0:{type:"signal",id:"0"}}})},Wr={flags:{isPureFunction:!0,isDspInline:!0,alphaName:"_mixer_t"},dsp:({node:e,ins:t})=>c`${Object.keys(e.inlets).map(n=>t[n]).join(" + ")}`};var se=(e,t)=>f([s(t.Message,"m")])`
    if (${t.isMatching}(m, [${t.FLOAT_TOKEN}])) {
        ${e} = ${t.readFloatToken}(m, 0)
        return
    }
`,Vr=(e,t)=>f([s(t.Message,"m")])`
    if (${t.isMatching}(m, [${t.STRING_TOKEN}])) {
        ${e} = ${t.readStringToken}(m, 0)
        return
    }
`,F=(e,t,n)=>f([s(n.Message,"m")])`
    if (${n.isMatching}(m, [${n.FLOAT_TOKEN}])) {
        ${e}(${t}, ${n.readFloatToken}(m, 0))
        return
    }
`;var It={translateArgs:({args:e})=>({initValue:I(e[0])||0}),build:()=>({inlets:{0:{type:"message",id:"0"}},outlets:{0:{type:"signal",id:"0"}}})},zr={flags:{isPureFunction:!0,isDspInline:!0,alphaName:"sig_t"},state:({node:{args:e},ns:t})=>y(t.State,[s("Float","currentValue",e.initValue)]),dsp:({state:e})=>c`${e}.currentValue`,messageReceivers:({state:e},{msg:t})=>({0:se(`${e}.currentValue`,t)})};var bt={translateArgs:()=>({}),build:()=>({inlets:{0:{type:"message",id:"0"}},outlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}}})},Gr={messageReceivers:({snds:e},{msg:t})=>({0:f([s(t.Message,"m")])`
            if (${t.isMatching}(m, [${t.FLOAT_TOKEN}])) {
                ${e.$0}(m)
                return
            } else {
                ${e.$1}(m)
                return
            }
        `})};var U=(e,t)=>{let n=e[t];if(n)return n;throw new Error(`Node "${t}" not found in graph`)},wt=(e,t)=>{let n=e.inlets[t];if(n)return n;throw new Error(`Inlet "${t}" not found in node ${e.id} of type ${e.type}`)},me=(e,t)=>{let n=e.outlets[t];if(n)return n;throw new Error(`Outlet "${t}" not found in node ${e.id} of type ${e.type}`)},nt=(e,t)=>e.sinks[t]||[],Se=(e,t)=>e.sources[t]||[];var Ie=(e,t="DUMMY")=>({id:e,type:t,args:{},sources:{},sinks:{},inlets:{},outlets:{}}),rt=(e,t)=>e.portletId===t.portletId&&e.nodeId===t.nodeId;var be=(e,t)=>{if(!e[t.id])e[t.id]=t;else throw new Error(`Node "${t.id}" already exists`);return e[t.id]},Q=(e,t,n)=>{let r=U(e,n.nodeId),a=U(e,t.nodeId),o=Se(r,n.portletId),i=nt(a,t.portletId),l=me(a,t.portletId),d=wt(r,n.portletId);if(!i.some(p=>rt(n,p))){if(!l)throw new Error(`Undefined outlet ${t.nodeId}:${t.portletId}`);if(!d)throw new Error(`Undefined inlet ${n.nodeId}:${n.portletId}`);if(l.type!==d.type)throw new Error(`Incompatible portlets types ${t.nodeId} | ${t.portletId} (${l.type}) -> ${n.nodeId} | ${n.portletId} (${d.type})`);if(d.type==="signal"&&o.length)throw new Error("Signal inlets can have only one connection");Kr(r.sources,n.portletId).push(t),Kr(a.sinks,t.portletId).push(n)}},jr=(e,t,n)=>{let r=U(e,t),a=U(e,n);Object.entries(a.sources).forEach(([o,i])=>a.sources[o]=i.filter(l=>l.nodeId!==t)),Object.entries(r.sinks).forEach(([o,i])=>r.sinks[o]=i.filter(l=>l.nodeId!==n))},qr=(e,t)=>{let n=e[t];n&&(Object.values(n.sources).forEach(r=>r.slice(0).forEach(a=>jr(e,a.nodeId,t))),Object.values(n.sinks).forEach(r=>r.slice(0).forEach(a=>jr(e,t,a.nodeId))),delete e[t])},Kr=(e,t)=>e[t]=e[t]||[];var We={MIXER:"_mixer~",ROUTE_MSG:"_routemsg",CONSTANT_SIGNAL:"sig~"},Tt;(function(e){e.PD="n",e.IMPLICIT_NODE="m"})(Tt||(Tt={}));var he=(e,t)=>`${Tt.PD}_${e}_${t}`,Mn=e=>e.toString(10),An=(e,t)=>(t=t.replaceAll(/[^a-zA-Z0-9_]/g,""),`${Tt.IMPLICIT_NODE}_${e.nodeId}_${e.portletId}_${t}`),Hr=async(e,t,n=async r=>({status:1,unknownNodeType:r}))=>{let r=await Dr(e,t,n),a=Object.keys(r.warnings);if(r.status===1)return{status:1,abstractionsLoadingErrors:r.errors,abstractionsLoadingWarnings:a?r.warnings:void 0};let{pd:o}=r,i={pd:o,nodeBuilders:t,graph:{}},l=ce(o);vn(i,[l],Ol),Cl(i,[l]),Object.values(i.graph).forEach(p=>{Object.keys(yt).includes(p.type)&&qr(i.graph,p.id)});let d=Object.values(i.pd.arrays).reduce((p,m)=>(p[m.args[0]]=m.data?new Float32Array(m.data):new Float32Array(m.args[1]),p),{});return{status:0,graph:i.graph,pd:i.pd,arrays:d,abstractionsLoadingWarnings:a?r.warnings:void 0}},Ol=(e,t)=>{let n=fe(t),r=Bl(t);Object.values(n.nodes).forEach(a=>{let o=he(n.id,a.id);Ll(e,r,n,a,o)})},Ll=(e,t,n,r,a)=>{let o=Ue(e.nodeBuilders,r.type);if(o===null)throw new Error(`unknown node type ${r.type}`);let{nodeBuilder:i,nodeType:l}=o;if(i.isNoop===!0)return null;i.skipDollarArgsResolution||(r={...r,args:gt(t,r.args)});let d=i.translateArgs(r,n,e.pd),p=i.build(d);return be(e.graph,{...Ie(a,l),args:d,...p})},Cl=(e,t)=>{let{graph:n}=e,r=[];vn(e,t,(o,i)=>{Ul(o,i,r)});let a=Dl(e,r);Object.values(n).forEach(o=>{Object.values(o.inlets).forEach(i=>{let l={nodeId:o.id,portletId:i.id},d=(a[o.id]?a[o.id][i.id]:void 0)||{signalSources:[],messageSources:[]};if(i.type==="signal"){let{nodeBuilder:p}=Ue(e.nodeBuilders,o.type),m=p.configureMessageToSignalConnection?p.configureMessageToSignalConnection(l.portletId,o.args):void 0;Pl(n,d.signalSources,d.messageSources,l,m)}else{if(d.signalSources.length!==0)throw new Error(`Unexpected signal connection to node id ${l.nodeId}, inlet ${l.portletId}`);Rl(n,d.messageSources,l)}})})},Rl=(e,t,n)=>t.forEach(r=>{Q(e,r,n)}),Pl=(e,t,n,r,a)=>{let o=null;if(t.length===1)Q(e,t[0],r);else if(t.length>1){let i={channelCount:t.length},l=be(e,{...Ie(An(r,We.MIXER),We.MIXER),args:i,...St.build(i)});Q(e,{nodeId:l.id,portletId:"0"},r),t.forEach((d,p)=>{Q(e,d,{nodeId:l.id,portletId:Mn(p)})})}else{let i={initValue:a?a.initialSignalValue:0};o=be(e,{...Ie(An(r,We.CONSTANT_SIGNAL),We.CONSTANT_SIGNAL),args:i,...It.build(i)}),Q(e,{nodeId:o.id,portletId:"0"},r)}if(n.length){let i={},l=be(e,{...Ie(An(r,We.ROUTE_MSG),We.ROUTE_MSG),args:i,...bt.build(i)}),d=!1;o&&(Q(e,{nodeId:l.id,portletId:"0"},{nodeId:o.id,portletId:"0"}),d=!0),a&&a.reroutedMessageInletId!==void 0&&(Q(e,{nodeId:l.id,portletId:"1"},{nodeId:r.nodeId,portletId:a.reroutedMessageInletId}),d=!0),d&&n.forEach(p=>{Q(e,p,{nodeId:l.id,portletId:"0"})})}},Dl=(e,t)=>{let{graph:n}=e,r={};return t.forEach(a=>{let[o,i]=a,[l,d]=i,p=he(fe(l).id,d.nodeId);r[p]=r[p]||{};let m=Mn(d.portletId);if(r[p][m])return;let $=[];t.forEach(k=>{let[E,ae]=k;Fn(i,ae)&&$.push(E)});let M=[],x=[];$.forEach(([k,E])=>{let ae=fe(k),oe={nodeId:he(ae.id,E.nodeId),portletId:Mn(E.portletId)},un=U(n,oe.nodeId);me(un,oe.portletId).type==="signal"?M.push(oe):x.push(oe)}),r[p][m]={signalSources:M,messageSources:x}}),r},Ul=(e,t,n)=>{let{graph:r}=e,a=fe(t);a.connections.filter(({source:i,sink:l})=>{let d=he(a.id,i.nodeId),p=he(a.id,l.nodeId);return!!(r[d]&&r[p])}).forEach(({source:i,sink:l})=>{let d=kn(e,[t,i]),p=Nn(e,t,l);d.forEach(m=>p.forEach($=>{n.some(([x,k])=>Fn(m,x)&&Fn($,k))||n.push([m,$])}))})},kn=(e,[t,n])=>{let{pd:r}=e,a=fe(t),o=Sn(a,n.nodeId);if(o.type==="inlet"||o.type==="inlet~"){let i=Yr(t);if(!i)return[];let l=Qr(i,a.id),d=Jr(a.inlets,o.id);return i.connections.filter(({sink:p})=>p.nodeId===l.id&&p.portletId===d).flatMap(({source:p})=>kn(e,[[...t.slice(0,-1)],p]))}else if(o.nodeClass==="subpatch"){let i=De(r,o.patchId),l=Xr(i.outlets,n.portletId);return i.connections.filter(({sink:d})=>d.nodeId===l&&d.portletId===0).flatMap(({source:d})=>kn(e,[[...t,i],d]))}else return[[t,n]]},Nn=(e,t,n)=>{let{pd:r}=e,a=fe(t),o=Sn(a,n.nodeId);if(o.type==="outlet"||o.type==="outlet~"){let i=Yr(t);if(!i)return[];let l=Qr(i,a.id),d=Jr(a.outlets,o.id);return i.connections.filter(({source:p})=>p.nodeId===l.id&&p.portletId===d).flatMap(({sink:p})=>Nn(e,[...t.slice(0,-1)],p))}else if(o.nodeClass==="subpatch"){let i=De(r,o.patchId),l=Xr(i.inlets,n.portletId);return i.connections.filter(({source:d})=>d.nodeId===l&&d.portletId===0).flatMap(({sink:d})=>Nn(e,[...t,i],d))}else return[[t,n]]},vn=(e,t,n)=>{let r=fe(t);n(e,t),Object.values(r.nodes).forEach(a=>{if(a.nodeClass==="subpatch"){let o=De(e.pd,a.patchId);vn(e,[...t,o],n)}})},fe=e=>{let t=e.slice(-1)[0];if(!t)throw new Error("patchPath empty !");return t},Yr=e=>e.length<2?null:e.slice(-2)[0],Bl=e=>{let t=e.slice(0).reverse().find(n=>n.isRoot);if(!t)throw new Error("Could not resolve root patch from path");return t},Xr=(e,t)=>{let n=e[t];if(n===void 0)throw new Error(`Portlet ${t} is undefined in patch.outlets/patch.inlets`);return n},Jr=(e,t)=>e.findIndex(n=>n===t),Qr=(e,t)=>{let n=Object.values(e.nodes).find(r=>r.nodeClass==="subpatch"&&r.patchId===t);if(n===void 0)throw new Error(`could not find subpatch node with patchId=${t} inside patch ${e.id}`);return n},Fn=([e,t],[n,r])=>fe(e).id===fe(n).id&&t.nodeId===r.nodeId&&t.portletId===r.portletId;var Zr=(e,t)=>{let n=t.x-e.x,r=t.y-e.y;return a=>({x:a.x+n,y:a.y+r})},ea=(e,t)=>({x:e.x+t.x,y:e.y+t.y}),ta=(e,t)=>{let n={x:Math.max(e.topLeft.x,t.topLeft.x),y:Math.max(e.topLeft.y,t.topLeft.y)},r={x:Math.min(e.bottomRight.x,t.bottomRight.x),y:Math.min(e.bottomRight.y,t.bottomRight.y)};return r.x<=n.x||r.y<=n.y?null:{topLeft:n,bottomRight:r}},na=(e,t)=>t.topLeft.x<=e.x&&e.x<=t.bottomRight.x&&t.topLeft.y<=e.y&&e.y<=t.bottomRight.y;var xt=e=>aa(e,ce(e)),aa=(e,t,n=null)=>{n===null&&(n={topLeft:{x:-1/0,y:-1/0},bottomRight:{x:1/0,y:1/0}});let r=[];return Object.values(t.nodes).forEach(a=>{if(a.type==="pd"&&a.nodeClass==="subpatch"){let o=e.patches[a.patchId],i=ra(a);if(!o.layout.graphOnParent)return;let l=Wl(o),d=Zr({x:i.x,y:i.y},{x:l.viewportX,y:l.viewportY}),p={topLeft:d(n.topLeft),bottomRight:d(n.bottomRight)},m={x:l.viewportX,y:l.viewportY},$={topLeft:m,bottomRight:ea(m,{x:l.viewportWidth,y:l.viewportHeight})},M=ta(p,$);if(M===null)return;let x=aa(e,o,M),k={nodeClass:"subpatch",patchId:t.id,pdNodeId:a.id,children:x};r.push(k)}else if(a.type in Ze&&a.nodeClass==="control"){let o=ra(a);if(!na({x:o.x,y:o.y},n))return;let i={nodeClass:"control",patchId:t.id,pdNodeId:a.id,nodeId:he(t.id,a.id)};r.push(i)}else if(t.id===e.rootPatchId&&a.nodeClass==="text"){let o={nodeClass:"text",patchId:t.id,pdNodeId:a.id};r.push(o)}}),r},Ne=(e,t)=>{e.forEach(n=>{n.nodeClass==="subpatch"?(t(n),Ne(n.children,t)):t(n)})},Wl=e=>{let t=e.layout,n=t.viewportX,r=t.viewportY,a=t.viewportWidth,o=t.viewportHeight;if(typeof n!="number"||typeof r!="number"||typeof a!="number"||typeof o!="number")throw new Error("Missing patch layout attributes");return{viewportX:n,viewportY:r,viewportWidth:a,viewportHeight:o}},ra=e=>{let t=e.layout.x,n=e.layout.y;if(typeof t!="number"||typeof n!="number")throw new Error("Missing node layout attributes");let r=null;return e.nodeClass==="control"?r=e.layout.label:e.nodeClass==="subpatch"&&(r=e.args[0]?e.args[0].toString():null),{x:t,y:n,label:r}};var At=(e,t,n)=>{let r=_t(n);return{keys:[...r.keys,t],parents:[...r.parents,e]}},_t=e=>e||{keys:[],parents:[]},En=()=>{throw new Error("This Proxy is read-only.")},at=(e,t,n)=>{if(!(t in e)){if(["toJSON","Symbol(Symbol.toStringTag)","constructor","$typeof","$$typeof","@@__IMMUTABLE_ITERABLE__@@","@@__IMMUTABLE_RECORD__@@","then"].includes(t))return!0;throw new Error(`namespace${n?` <${n.keys.join(".")}>`:""} doesn't know key "${String(t)}"`)}return!1},w=(e,t,n,r)=>{let a=r||{keys:[],parents:[]},o=w.ensureValue(t,e,n,a);if(r){let i=r.parents[r.parents.length-1],l=r.keys[r.keys.length-1];(!(l in i)||"LiteralDefaultNull"in e)&&(i[l]=o)}return"Literal"in e||"LiteralDefaultNull"in e?o:new Proxy(o,{get:(i,l)=>{let d=String(l),p;if("Index"in e)p=e.Index(d,n,a);else if("Interface"in e){if(!(d in e.Interface))throw new Error(`Interface has no entry "${String(d)}"`);p=e.Interface[d]}else throw new Error("no builder");return w(p,d in o?o[d]:void 0,n,At(o,d,a))},set:En})};w.ensureValue=(e,t,n,r,a)=>{if("Index"in t)return e||t.indexConstructor(n,_t(r));if("Interface"in t){let o=e||{};return Object.entries(t.Interface).forEach(([i,l])=>{o[i]=w.ensureValue(o[i],l,n,At(o,i,r),At(o,i,a))}),o}else{if("Literal"in t)return e||t.Literal(n,_t(r));if("LiteralDefaultNull"in t)return a?e||null:e||t.LiteralDefaultNull(n,_t(r));throw new Error("Invalid Assigner")}};w.Interface=e=>({Interface:e});w.Index=(e,t)=>({Index:e,indexConstructor:t||(()=>({}))});w.Literal=e=>({Literal:e});w.LiteralDefaultNull=e=>({LiteralDefaultNull:e});var we=(e,t)=>new Proxy(e,{get:(n,r)=>{let a=String(r);if(!at(n,a,t))return n[a]},set:(n,r,a)=>{let o=oa(String(r));if(n.hasOwnProperty(o))throw new Error(`Key "${String(o)}" is protected and cannot be overwritten.`);return n[o]=a,a}}),Z=(e,t)=>new Proxy(e,{get:(n,r)=>{let a=String(r);if(at(n,a,t))return;let o=n[a];return typeof o=="object"&&o!==null?Z(o,At(n,a,t)):o},set:En}),Fe=(e,t,n)=>new Proxy(e,{get:(r,a)=>{let o=oa(String(a));if(!at(r,o,{parents:[r],keys:[t,n]}))return r[o]},set:En}),oa=e=>{let t=/\$(.*)/.exec(e);return t?t[1]:e};var ge=e=>e===64?Float64Array:Float32Array,H=(e,t)=>new Proxy({},{get:(n,r)=>{if(t.hasOwnProperty(r)){let a=String(r),o=t[a];switch(o.type){case"raw":if(r in e)return e[a];throw new Error(`Key ${String(a)} doesn't exist in raw module`);case"proxy":case"callback":return o.value}}else return},has:function(n,r){return r in t},set:(n,r,a)=>{if(t.hasOwnProperty(String(r))){let o=String(r),i=t[o];if(i.type==="callback")i.value=a;else throw new Error(`Binding key ${String(o)} is read-only`)}else throw new Error(`Key ${String(r)} is not defined in bindings`);return!0}}),Mt=(e,t)=>kt(e,{globals:t.globals,io:t.io}),kt=(e,t)=>{if(typeof t=="string")return e[t];if(typeof t=="object")return new Proxy(e,{get:(n,r)=>{let a=String(r);if(a in e)return Reflect.get(e,a);if(a in t){let o=t[a];return kt(e,o)}else if(at(e,a))return},has:function(n,r){return r in e||r in t},set:(n,r,a)=>{let o=String(r);if(o in t){let i=t[o];if(typeof i!="string")throw new Error(`Failed to set value for key ${String(r)}: variable name is not a string`);return Reflect.set(e,i,a)}else throw new Error(`Key ${String(r)} is not defined in raw module`)}});throw new Error("Invalid name mapping")};var ee=(e,t)=>{if(!t)throw new Error("Cannot lift a null pointer");t=t>>>0;let n=t+new Uint32Array(e.memory.buffer)[t-4>>>2]>>>1,r=new Uint16Array(e.memory.buffer),a=t>>>1,o="";for(;n-a>1024;)o+=String.fromCharCode(...r.subarray(a,a+=1024));return o+String.fromCharCode(...r.subarray(a,n))},ot=(e,t)=>{if(t==null)throw new Error("Cannot lower a null string");let n=t.length,r=e.__new(n<<1,1)>>>0,a=new Uint16Array(e.memory.buffer);for(let o=0;o<n;++o)a[(r>>>1)+o]=t.charCodeAt(o);return r},ie=(e,t,n)=>{if(!n)throw new Error("Cannot lift a null pointer");let r=new Uint32Array(e.memory.buffer);return new t(e.memory.buffer,r[n+4>>>2],r[n+8>>>2]/t.BYTES_PER_ELEMENT)},On=(e,t,n)=>{let r=ge(t),a=e.globals.core.createFloatArray(n.length),o=ie(e,r,a);return o.set(n),{array:o,arrayPointer:a}},Ln=(e,t,n)=>{let r=e.globals.core.x_createListOfArrays();return n.forEach(a=>{let{arrayPointer:o}=On(e,t,a);e.globals.core.x_pushToListOfArrays(r,o)}),r},Cn=(e,t,n)=>{let r=e.globals.core.x_getListOfArraysLength(n),a=[],o=ge(t);for(let i=0;i<r;i++){let l=e.globals.core.x_getListOfArraysElem(n,i);a.push(ie(e,o,l))}return a};var Nt=async(e,t={})=>{let n=await WebAssembly.instantiate(e,{env:{abort:(a,o,i,l)=>{let d=ee(r,a);i=i,l=l,(()=>{throw Error(`${d} at ${i}:${l}`)})()},seed:()=>Date.now()*Math.random(),"console.log":a=>{console.log(ee(r,a))}},...t}),r=n.instance.exports;return n.instance};var Ft=async e=>{let t={};WebAssembly.Module.imports(new WebAssembly.Module(e)).filter(l=>l.module==="input"&&l.kind==="function").forEach(l=>t[l.name]=()=>{});let a=(await Nt(e,{input:t})).exports,o=a.metadata.valueOf(),i=ee(a,o);return JSON.parse(i)};var sa=e=>{let t=e.metadata.compilation.variableNamesIndex.globals.fs,n=H(e,{onReadSoundFile:{type:"callback",value:()=>{}},onWriteSoundFile:{type:"callback",value:()=>{}},onOpenSoundReadStream:{type:"callback",value:()=>{}},onOpenSoundWriteStream:{type:"callback",value:()=>{}},onSoundStreamData:{type:"callback",value:()=>{}},onCloseSoundStream:{type:"callback",value:()=>{}},sendReadSoundFileResponse:{type:"proxy",value:"x_onReadSoundFileResponse"in t?e.globals.fs.x_onReadSoundFileResponse:void 0},sendWriteSoundFileResponse:{type:"proxy",value:"x_onWriteSoundFileResponse"in t?e.globals.fs.x_onWriteSoundFileResponse:void 0},sendSoundStreamData:{type:"proxy",value:"x_onSoundStreamData"in t?e.globals.fs.x_onSoundStreamData:void 0},closeSoundStream:{type:"proxy",value:"x_onCloseSoundStream"in t?e.globals.fs.x_onCloseSoundStream:void 0}});return"i_openSoundWriteStream"in t&&(e.globals.fs.i_openSoundWriteStream=(...r)=>n.onOpenSoundWriteStream(...r)),"i_sendSoundStreamData"in t&&(e.globals.fs.i_sendSoundStreamData=(...r)=>n.onSoundStreamData(...r)),"i_openSoundReadStream"in t&&(e.globals.fs.i_openSoundReadStream=(...r)=>n.onOpenSoundReadStream(...r)),"i_closeSoundStream"in t&&(e.globals.fs.i_closeSoundStream=(...r)=>n.onCloseSoundStream(...r)),"i_writeSoundFile"in t&&(e.globals.fs.i_writeSoundFile=(...r)=>n.onWriteSoundFile(...r)),"i_readSoundFile"in t&&(e.globals.fs.i_readSoundFile=(...r)=>n.onReadSoundFile(...r)),n};var ia=(e,t)=>{let n=ge(t.settings.audio.bitDepth);return H(e,{getArray:{type:"proxy",value:r=>e.globals.commons.getArray(r)},setArray:{type:"proxy",value:(r,a)=>e.globals.commons.setArray(r,new n(a))}})};var Vl=e=>new Function(`
        ${e}
        return exports
    `)(),zl=e=>{let t=e.metadata.compilation.variableNamesIndex.globals,n={commons:{type:"proxy",value:ia(e,e.metadata)}};return"fs"in t&&(n.fs={type:"proxy",value:sa(e)}),{metadata:{type:"raw"},initialize:{type:"raw"},dspLoop:{type:"raw"},io:{type:"raw"},globals:{type:"proxy",value:H(e,n)}}},vt=(e,t)=>{let n=Vl(e),r=Mt(n,n.metadata.compilation.variableNamesIndex);return H(n,{...zl(r),...t||{}})};var Rn=async(e,t)=>{switch(e){case"assemblyscript":return Ft(t);case"javascript":return vt(t).metadata}};var la="webpd-runtime.js",ua=async e=>{if(!e.javascript&&!e.wasm)throw new Error("Needs at least javascript or wasm to run");let t,n,r,a;e.javascript?(t="javascript",n="patch.js",r=await Rn("javascript",e.javascript),a=e.javascript):(t="assemblyscript",n="patch.wasm",r=await Rn("assemblyscript",e.wasm),a=e.wasm);let o=r.customMetadata;if(!o.pdGui||!o.graph||!o.pdNodes)throw new Error("Missing data in WebPd metadata");return{[la]:Pr,[n]:a,"index.html":`
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>WebPd boilerplate</title>
        <style>
            #start {
                display: none;
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            #loading {
                width: 100%;
                height: 100%;
                position: fixed;
                top: 50%;
                transform: translateY(-50%);
                display: flex;
                justify-content: center;
                align-items: center;
            }
        </style>
    </head>
    <body>
        <h1>My Web Page</h1>
        <div>For more info about usage (how to interact with the patch), you can open this HTML file in a code editor.</div>
        <button id="start"> Start </button>
        <div id="loading"> Loading ... </div>
        <script src="${la}"><\/script>
        <script>
            // SUMMARY
            // 1. WEB PAGE INITIALIZATION
            // 2. SENDING MESSAGES FROM JAVASCRIPT TO THE PATCH
            // 3. SENDING MESSAGES FROM THE PATCH TO JAVASCRIPT


            // ------------- 1. WEB PAGE INITIALIZATION
            const loadingDiv = document.querySelector('#loading')
            const startButton = document.querySelector('#start')
            const audioContext = new AudioContext()

            let patch = null
            let stream = null
            let webpdNode = null

            const initApp = async () => {
                // Register the worklet
                await WebPdRuntime.initialize(audioContext)

                // Fetch the patch code
                response = await fetch('${n}')
                patch = await ${t==="javascript"?"response.text()":"response.arrayBuffer()"}

                // Comment this if you don't need audio input
                stream = await navigator.mediaDevices.getUserMedia({ audio: true })

                // Hide loading and show start button
                loadingDiv.style.display = 'none'
                startButton.style.display = 'block'
            }

            const startApp = async () => {
                // AudioContext needs to be resumed on click to protects users 
                // from being spammed with autoplay.
                // See : https://github.com/WebAudio/web-audio-api/issues/345
                if (audioContext.state === 'suspended') {
                    audioContext.resume()
                }

                // Setup web audio graph
                webpdNode = await WebPdRuntime.run(
                    audioContext, 
                    patch, 
                    WebPdRuntime.defaultSettingsForRun(
                        './${n}',
                        // Comment this if you don't need to receive messages from the patch
                        receiveMsgFromWebPd,
                    ),
                )
                webpdNode.connect(audioContext.destination)

                // Comment this if you don't need audio input
                const sourceNode = audioContext.createMediaStreamSource(stream)
                sourceNode.connect(webpdNode)

                // Hide the start button
                startButton.style.display = 'none'
            }

            startButton.onclick = startApp

            initApp().
                then(() => {
                    console.log('App initialized')
                })

            
            // ------------- 2. SENDING MESSAGES FROM JAVASCRIPT TO THE PATCH
            // Use the function sendMsgToWebPd to send a message from JavaScript to an object inside your patch.
            // 
            // Parameters : 
            // - nodeId: the ID of the object you want to send a message to. 
            //          This ID is a string that has been assigned by WebPd at compilation.
            //          You can find below the list of available IDs with hints to help you 
            //          identify the object you want to interact with.
            // - portletId : the ID of the object portlet to which the message should be sent. 
            // - message : the message to send. This must be a list of strings and / or numbers.
            // 
            // Examples :
            // - sending a message to a bang node of ID 'n_0_1' :
            //          sendMsgToWebPd('n_0_1', '0', ['bang'])
            // - sending a message to a number object of ID 'n_0_2' :
            //          sendMsgToWebPd('n_0_2', '0', [123])
            // 
            const sendMsgToWebPd = (nodeId, portletId, message) => {
                webpdNode.port.postMessage({
                    type: 'io:messageReceiver',
                    payload: {
                        nodeId,
                        portletId,
                        message,
                    },
                })
            }
            
            // Here is an index of objects IDs to which you can send messages, with hints so you can find the right ID.
            // Note that by default only GUI objects (bangs, sliders, etc ...) are available.${da(r.settings.io.messageReceivers,o,(l,d,p)=>`
            //  - nodeId "${l.id}" portletId "${d}"
            //      * type "${l.type}"
            //      * position ${p.x} ${p.y}${p.label?`
            //      * label "${p.label}"`:""}
            `,(l,d)=>`
            //  - nodeId "${l.id}" portletId "${d}"
            //      * type "send"
            //      * send "${l.args.busName}"
            `,`
            // EMPTY (did you place a GUI object or send object in your patch ?)
`)}

            // ------------- 3. SENDING MESSAGES FROM THE PATCH TO JAVASCRIPT
            // Use the function receiveMsgFromWebPd to receive a message from an object inside your patch.
            // 
            // Parameters : 
            // - nodeId: the ID of the object that is sending a message. 
            //          This ID is a string that has been assigned by WebPd at compilation.
            //          You can find below the list of available IDs with hints to help you 
            //          identify the object you want to interact with.
            // - portletId : the ID of the object portlet that is sending the message.
            // - message : the message that was sent. It is a list of strings and / or numbers.
            const receiveMsgFromWebPd = (nodeId, portletId, message) => {${da(r.settings.io.messageSenders,o,(l,d,p)=>`
                if (nodeId === "${l.id}" && portletId === "${d}") {
                    console.log('Message received from :\\n'
                        + '	* nodeId "${l.id}" portletId "${d}"\\n'
                        + '	* type "${l.type}"\\n'
                        + '	* position ${p.x} ${p.y}\\n'${p.label?`
                        + '	* label "${p.label}"'`:""}
                    )
                }`,(l,d)=>`
                if (nodeId === "${l.id}" && portletId === "${d}") {
                    console.log('Message received from :\\n'
                        + '	* nodeId "${l.id}" portletId "${d}"\\n'
                        + '	* type "receive"\\n'
                        + '	* receive "${l.args.busName}"'
                    )
                }`,`
                // /! there seems to be no message senders in the patch. 
                // Add a GUI object or a send object in your patch to be able to receive messages.
`)}                
            }

        <\/script>
    </body>
</html>`}},da=(e,t,n,r,a)=>{if(Object.keys(e).length){let o={};return Ne(t.pdGui,i=>{i.nodeClass==="control"&&(o[i.nodeId]=i)}),Object.entries(e).flatMap(([i,l])=>l.map(d=>{let p=U(t.graph,i);if(p.type==="send"||p.type==="receive")return r(p,d);let m=o[i];if(m)if(m.nodeClass==="control"){let $=t.pdNodes[m.patchId][m.pdNodeId];return n(p,d,$.layout)}else return"";else return""})).join("")}else return a};var Ve="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";function pa(e){let t="";for(let n=0;n<e.length;n+=3)t+=Ve[e[n]>>2],t+=Ve[(e[n]&3)<<4|e[n+1]>>4],t+=Ve[(e[n+1]&15)<<2|e[n+2]>>6],t+=Ve[e[n+2]&63];return e.length%3===2?t=t.substring(0,t.length-1)+"=":e.length%3===1&&(t=t.substring(0,t.length-2)+"=="),t}function ca(e){let t=new Uint8Array(256);for(let a=0;a<Ve.length;a++)t[Ve.charCodeAt(a)]=a;let n=e.length*.75;e[e.length-1]==="="&&(n--,e[e.length-2]==="="&&n--);let r=new Uint8Array(n);for(let a=0,o=0;a<e.length;a+=4){let i=t[e.charCodeAt(a)],l=t[e.charCodeAt(a+1)],d=t[e.charCodeAt(a+2)],p=t[e.charCodeAt(a+3)];r[o++]=i<<2|l>>4,r[o++]=(l&15)<<4|d>>2,r[o++]=(d&3)<<6|p&63}return r}function fa(e,t,n,r){if(["32f","64"].indexOf(t)>-1&&["32f","64"].indexOf(r)>-1){n.set(e);return}ma(t),ma(r);let a=ql(t,r),o={oldMin:Math.pow(2,parseInt(t,10))/2,newMin:Math.pow(2,parseInt(r,10))/2,oldMax:Math.pow(2,parseInt(t,10))/2-1,newMax:Math.pow(2,parseInt(r,10))/2-1};ha(t,e,!0);for(let i=0,l=e.length;i<l;i++)n[i]=a(e[i],o);ha(r,n,!1)}function Gl(e,t){return e>0?e=parseInt(e/t.oldMax*t.newMax,10):e=parseInt(e/t.oldMin*t.newMin,10),e}function jl(e,t){return parseInt(e>0?e*t.newMax:e*t.newMin,10)}function Kl(e,t){return e>0?e/t.oldMax:e/t.oldMin}function ql(e,t){let n=function(r){return r};return e!=t&&(["32f","64"].includes(e)?n=jl:["32f","64"].includes(t)?n=Kl:n=Gl),n}function ma(e){if(e!="32f"&&e!="64"&&(parseInt(e,10)<"8"||parseInt(e,10)>"53"))throw new Error("Invalid bit depth.")}function ha(e,t,n){if(e=="8"){let r=n?-128:128;for(let a=0,o=t.length;a<o;a++)t[a]=t[a]+=r}}var ya=[-1,-1,-1,-1,2,4,6,8,-1,-1,-1,-1,2,4,6,8],Dn=[7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,73,80,88,97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,724,796,876,963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,3327,3660,4026,4428,4871,5358,5894,6484,7132,7845,8630,9493,10442,11487,12635,13899,15289,16818,18500,20350,22385,24623,27086,29794,32767];function $a(e){let t={index:0,predicted:0,step:7},n=new Uint8Array(e.length),r=[],a=0,o=0;for(let l=0,d=e.length;l<d;l++)l%505==0&&l!=0&&(n.set(Hl(r,t),a),a+=256,r=[],o++),r.push(e[l]);let i=e.length/2;return i%2&&i++,n.slice(0,i+512+o*4)}function Sa(e,t=256){let n={index:0,predicted:0,step:7},r=new Int16Array(e.length*2),a=[],o=0;for(let i=0,l=e.length;i<l;i++){if(i%t==0&&i!=0){let d=Yl(a,n);r.set(d,o),o+=d.length,a=[]}a.push(e[i])}return r}function Hl(e,t){let n=Zl(e[0],t);for(let r=3,a=e.length;r<a;r+=2){let o=Pn(e[r],t),i=Pn(e[r+1],t);n.push(i<<4|o)}return n}function Yl(e,t){t.predicted=Xl(e[1]<<8|e[0]),t.index=e[2],t.step=Dn[t.index];let n=[t.predicted,t.predicted];for(let r=4,a=e.length;r<a;r++){let o=e[r],i=o>>4,l=i<<4^o;n.push(ga(l,t)),n.push(ga(i,t))}return n}function Xl(e){return e>32768?e-65536:e}function Pn(e,t){let n=e-t.predicted,r=0;n>=0?r=0:(r=8,n=-n);let a=Dn[t.index],o=a>>3;return n>a&&(r|=4,n-=a,o+=a),a>>=1,n>a&&(r|=2,n-=a,o+=a),a>>=1,n>a&&(r|=1,o+=a),Jl(r,o,t),r}function Jl(e,t,n){e&8?n.predicted-=t:n.predicted+=t,n.predicted<-32768?n.predicted=-32768:n.predicted>32767&&(n.predicted=32767),n.index+=ya[e&7],n.index<0?n.index=0:n.index>88&&(n.index=88)}function ga(e,t){let n=0;return e&4&&(n+=t.step),e&2&&(n+=t.step>>1),e&1&&(n+=t.step>>2),n+=t.step>>3,e&8&&(n=-n),t.predicted+=n,t.predicted>32767?t.predicted=32767:t.predicted<-32767&&(t.predicted=-32767),Ql(e,t),t.predicted}function Ql(e,t){t.index+=ya[e],t.index<0?t.index=0:t.index>88&&(t.index=88),t.step=Dn[t.index]}function Zl(e,t){Pn(e,t);let n=[];return n.push(e&255),n.push(e>>8&255),n.push(t.index),n.push(0),n}var ed=[1,1,2,2,3,3,3,3,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7];function td(e){let t;e=e==-32768?-32767:e;let n=~e>>8&128;if(n||(e=e*-1),e>32635&&(e=32635),e>=256){let r=ed[e>>8&127],a=e>>r+3&15;t=r<<4|a}else t=e>>4;return t^(n^85)}function nd(e){let t=0;e^=85,(e&128)!==0&&(e&=-129,t=-1);let n=((e&240)>>4)+4,r=0;return n!=4?r=1<<n|(e&15)<<n-4|1<<n-5:r=e<<1|1,r=t===0?r:-r,r*8*-1}function Ia(e){let t=new Uint8Array(e.length);for(let n=0,r=e.length;n<r;n++)t[n]=td(e[n]);return t}function ba(e){let t=new Int16Array(e.length);for(let n=0,r=e.length;n<r;n++)t[n]=nd(e[n]);return t}var rd=[0,0,1,1,2,2,2,2,3,3,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7],ad=[0,132,396,924,1980,4092,8316,16764];function od(e){let t,n,r,a;return t=e>>8&128,t!=0&&(e=-e),e=e+132,e>32635&&(e=32635),n=rd[e>>7&255],r=e>>n+3&15,a=~(t|n<<4|r),a}function sd(e){let t,n,r,a;return e=~e,t=e&128,n=e>>4&7,r=e&15,a=ad[n]+(r<<n+3),t!=0&&(a=-a),a}function wa(e){let t=new Uint8Array(e.length);for(let n=0,r=e.length;n<r;n++)t[n]=od(e[n]);return t}function Ta(e){let t=new Int16Array(e.length);for(let n=0,r=e.length;n<r;n++)t[n]=sd(e[n]);return t}function Un(e,t,n=0,r=e.length){for(let a=n;a<r;a+=t)id(e,t,a)}function id(e,t,n){t--;for(let r=0;r<t;r++){let a=e[n+r];e[n+r]=e[n+t],e[n+t]=a,t--}}function xa(e,t=0,n=e.length){let r="";for(let a=t;a<n;){let o=128,i=191,l=!1,d=e[a++];if(d>=0&&d<=127)r+=String.fromCharCode(d);else{let p=0;d>=194&&d<=223?p=1:d>=224&&d<=239?(p=2,e[a]===224&&(o=160),e[a]===237&&(i=159)):d>=240&&d<=244?(p=3,e[a]===240&&(o=144),e[a]===244&&(i=143)):l=!0,d=d&(1<<8-p-1)-1;for(let m=0;m<p;m++)(e[a]<o||e[a]>i)&&(l=!0),d=d<<6|e[a]&63,a++;l?r+="\uFFFD":d<=65535?r+=String.fromCharCode(d):(d-=65536,r+=String.fromCharCode((d>>10&1023)+55296,(d&1023)+56320))}}return r}function Bn(e,t,n=0){let r=0,a=e.length;for(;r<a;){let o=e.codePointAt(r);if(o<128)t[n]=o,n++;else{let i=0,l=0;for(o<=2047?(i=1,l=192):o<=65535?(i=2,l=224):o<=1114111&&(i=3,l=240,r++),t[n]=(o>>6*i)+l,n++;i>0;)t[n]=128|o>>6*(i-1)&63,n++,i--}r++}return n}var Et=class{constructor(t,n=!1){this.bits=t,this.offset=Math.ceil(t/8),this.max=Math.pow(2,t)-1,this.min=0,this.unpack=this.unpack_,n&&(this.max=Math.pow(2,t)/2-1,this.min=-this.max-1,this.unpack=this.unpackSigned_)}pack(t,n,r=0){n=this.clamp_(Math.round(n));for(let a=0,o=this.offset;a<o;a++)t[r]=Math.floor(n/Math.pow(2,a*8))&255,r++;return r}unpack_(t,n=0){let r=0;for(let a=0;a<this.offset;a++)r+=t[n+a]*Math.pow(256,a);return r}unpackSigned_(t,n=0){return this.sign_(this.unpack_(t,n))}clamp_(t){return t>this.max?this.max:t<this.min?this.min:t}sign_(t){return t>this.max&&(t-=this.max*2+2),t}};var st=class{constructor(t,n){this.offset=Math.ceil((t+n)/8),this.ebits=t,this.fbits=n,this.bias=(1<<t-1)-1,this.biasP2=Math.pow(2,this.bias+1),this.ebitsFbits=t+n,this.fbias=Math.pow(2,-(8*this.offset-1-t))}pack(t,n,r){Math.abs(n)>this.biasP2-this.ebitsFbits*2&&(n=n<0?-1/0:1/0);let a=((n=+n)||1/n)<0||n<0?1:0;n=Math.abs(n);let o=Math.min(Math.floor(Math.log(n)/Math.LN2),1023),i=Wn(n/Math.pow(2,o)*Math.pow(2,this.fbits));return n!==n?(i=Math.pow(2,this.fbits-1),o=(1<<this.ebits)-1):n!==0&&(n>=Math.pow(2,1-this.bias)?(i/Math.pow(2,this.fbits)>=2&&(o=o+1,i=1),o>this.bias?(o=(1<<this.ebits)-1,i=0):(o=o+this.bias,i=Wn(i)-Math.pow(2,this.fbits))):(i=Wn(n/Math.pow(2,1-this.bias-this.fbits)),o=0)),this.packFloatBits_(t,r,a,o,i)}unpack(t,n){let r=(1<<this.ebits)-1,a,o="";for(let d=this.offset-1;d>=0;d--){let p=t[d+n].toString(2);o+="00000000".substring(p.length)+p}let i=o.charAt(0)=="1"?-1:1;o=o.substring(1);let l=parseInt(o.substring(0,this.ebits),2);return o=o.substring(this.ebits),l==r?parseInt(o,2)!==0?NaN:i*(1/0):(l===0?(l+=1,a=parseInt(o,2)):a=parseInt("1"+o,2),i*a*this.fbias*Math.pow(2,l-this.bias))}packFloatBits_(t,n,r,a,o){let i=[];i.push(r);for(let $=this.ebits;$>0;$-=1)i[$]=a%2?1:0,a=Math.floor(a/2);let l=i.length;for(let $=this.fbits;$>0;$-=1)i[l+$]=o%2?1:0,o=Math.floor(o/2);let d=i.join(""),p=this.offset+n-1,m=n;for(;p>=n;)t[p]=parseInt(d.substring(0,8),2),d=d.substring(8),p--,m++;return m}};function Wn(e){let t=Math.floor(e),n=e-t;return n<.5?t:n>.5||t%2?t+1:t}function Te(e,t=0,n=e.length){return xa(e,t,n)}function C(e){let t=[];return Bn(e,t),t}function Vn(e,t,n=0){return Bn(e,t,n)}function zn(e,t,n,r=0){t=t||{};let a=Aa(t.bits,t.fp,t.signed),o=Math.ceil(t.bits/8),i=0,l=r;for(let d=e.length;i<d;i++)r=a.pack(n,e[i],r);return t.be&&Un(n,o,l,r),r}function ye(e,t,n,r=0,a=e.length){t=t||{};let o=Aa(t.bits,t.fp,t.signed);if(a=dd(e,r,a,o.offset),t.be){let i=ld(e);t.be&&Un(i,o.offset,r,a),_a(i,n,r,a,o)}else _a(e,n,r,a,o)}function it(e,t,n,r=0){return zn([e],t,n,r)}function S(e,t){let n=[];return it(e,t,n,0),n}function ve(e,t,n=0){let r=[];return ye(e,t,r,n,n+Math.ceil(t.bits/8)),r[0]}function _a(e,t,n,r,a){let o=a.offset;for(let i=0,l=n;l<r;l+=o,i++)t[i]=a.unpack(e,l)}function ld(e){return new Uint8Array(e)}function dd(e,t,n,r){let a=(n-t)%r;return n-a}function Aa(e,t,n){return t&&e==32?new st(8,23):t&&e==64?new st(11,52):new Et(e,n)}var Ot=class{constructor(){this.container="",this.chunkSize=0,this.format="",this.signature=null,this.head=0,this.uInt32={bits:32,be:!1},this.supported_containers=["RIFF","RIFX"]}setSignature(t){if(this.head=0,this.container=this.readString(t,4),this.supported_containers.indexOf(this.container)===-1)throw Error("Not a supported format.");this.uInt32.be=this.container==="RIFX",this.chunkSize=this.readUInt32(t),this.format=this.readString(t,4),this.signature={chunkId:this.container,chunkSize:this.chunkSize,format:this.format,subChunks:this.getSubChunksIndex_(t)}}findChunk(t,n=!1){let r=this.signature.subChunks,a=[];for(let o=0;o<r.length;o++)if(r[o].chunkId==t)if(n)a.push(r[o]);else return r[o];return t=="LIST"&&a.length?a:null}readString(t,n){let r="";return r=Te(t,this.head,this.head+n),this.head+=n,r}readUInt32(t){let n=ve(t,this.uInt32,this.head);return this.head+=4,n}getSubChunksIndex_(t){let n=[],r=this.head;for(;r<=t.length-8;)n.push(this.getSubChunkIndex_(t,r)),r+=8+n[n.length-1].chunkSize,r=r%2?r+1:r;return n}getSubChunkIndex_(t,n){let r={chunkId:this.getChunkId_(t,n),chunkSize:this.getChunkSize_(t,n)};if(r.chunkId=="LIST")r.format=Te(t,n+8,n+12),this.head+=4,r.subChunks=this.getSubChunksIndex_(t);else{let a=r.chunkSize%2?r.chunkSize+1:r.chunkSize;this.head=n+8+a,r.chunkData={start:n+8,end:this.head}}return r}getChunkId_(t,n){return this.head+=4,Te(t,n,n+4)}getChunkSize_(t,n){return this.head+=4,ve(t,this.uInt32,n+4)}};var Lt=class e extends Ot{constructor(){super(),this.supported_containers.push("RF64"),this.fmt={chunkId:"",chunkSize:0,audioFormat:0,numChannels:0,sampleRate:0,byteRate:0,blockAlign:0,bitsPerSample:0,cbSize:0,validBitsPerSample:0,dwChannelMask:0,subformat:[]},this.fact={chunkId:"",chunkSize:0,dwSampleLength:0},this.cue={chunkId:"",chunkSize:0,dwCuePoints:0,points:[]},this.smpl={chunkId:"",chunkSize:0,dwManufacturer:0,dwProduct:0,dwSamplePeriod:0,dwMIDIUnityNote:0,dwMIDIPitchFraction:0,dwSMPTEFormat:0,dwSMPTEOffset:0,dwNumSampleLoops:0,dwSamplerData:0,loops:[]},this.bext={chunkId:"",chunkSize:0,description:"",originator:"",originatorReference:"",originationDate:"",originationTime:"",timeReference:[0,0],version:0,UMID:"",loudnessValue:0,loudnessRange:0,maxTruePeakLevel:0,maxMomentaryLoudness:0,maxShortTermLoudness:0,reserved:"",codingHistory:""},this.iXML={chunkId:"",chunkSize:0,value:""},this.ds64={chunkId:"",chunkSize:0,riffSizeHigh:0,riffSizeLow:0,dataSizeHigh:0,dataSizeLow:0,originationTime:0,sampleCountHigh:0,sampleCountLow:0},this.data={chunkId:"",chunkSize:0,samples:new Uint8Array(0)},this.LIST=[],this.junk={chunkId:"",chunkSize:0,chunkData:[]},this._PMX={chunkId:"",chunkSize:0,value:""},this.uInt16={bits:16,be:!1,signed:!1,fp:!1}}fromBuffer(t,n=!0){if(this.clearHeaders(),this.setSignature(t),this.uInt16.be=this.uInt32.be,this.format!="WAVE")throw Error('Could not find the "WAVE" format identifier');this.readDs64Chunk_(t),this.readFmtChunk_(t),this.readFactChunk_(t),this.readBextChunk_(t),this.readiXMLChunk_(t),this.readCueChunk_(t),this.readSmplChunk_(t),this.readDataChunk_(t,n),this.readJunkChunk_(t),this.readLISTChunk_(t),this.read_PMXChunk_(t)}clearHeaders(){let t=new e;Object.assign(this.fmt,t.fmt),Object.assign(this.fact,t.fact),Object.assign(this.cue,t.cue),Object.assign(this.smpl,t.smpl),Object.assign(this.bext,t.bext),Object.assign(this.iXML,t.iXML),Object.assign(this.ds64,t.ds64),Object.assign(this.data,t.data),this.LIST=[],Object.assign(this.junk,t.junk),Object.assign(this._PMX,t._PMX)}readFmtChunk_(t){let n=this.findChunk("fmt ");if(n)this.head=n.chunkData.start,this.fmt.chunkId=n.chunkId,this.fmt.chunkSize=n.chunkSize,this.fmt.audioFormat=this.readUInt16_(t),this.fmt.numChannels=this.readUInt16_(t),this.fmt.sampleRate=this.readUInt32(t),this.fmt.byteRate=this.readUInt32(t),this.fmt.blockAlign=this.readUInt16_(t),this.fmt.bitsPerSample=this.readUInt16_(t),this.readFmtExtension_(t);else throw Error('Could not find the "fmt " chunk')}readFmtExtension_(t){this.fmt.chunkSize>16&&(this.fmt.cbSize=this.readUInt16_(t),this.fmt.chunkSize>18&&(this.fmt.validBitsPerSample=this.readUInt16_(t),this.fmt.chunkSize>20&&(this.fmt.dwChannelMask=this.readUInt32(t),this.fmt.subformat=[this.readUInt32(t),this.readUInt32(t),this.readUInt32(t),this.readUInt32(t)])))}readFactChunk_(t){let n=this.findChunk("fact");n&&(this.head=n.chunkData.start,this.fact.chunkId=n.chunkId,this.fact.chunkSize=n.chunkSize,this.fact.dwSampleLength=this.readUInt32(t))}readCueChunk_(t){let n=this.findChunk("cue ");if(n){this.head=n.chunkData.start,this.cue.chunkId=n.chunkId,this.cue.chunkSize=n.chunkSize,this.cue.dwCuePoints=this.readUInt32(t);for(let r=0;r<this.cue.dwCuePoints;r++)this.cue.points.push({dwName:this.readUInt32(t),dwPosition:this.readUInt32(t),fccChunk:this.readString(t,4),dwChunkStart:this.readUInt32(t),dwBlockStart:this.readUInt32(t),dwSampleOffset:this.readUInt32(t)})}}readSmplChunk_(t){let n=this.findChunk("smpl");if(n){this.head=n.chunkData.start,this.smpl.chunkId=n.chunkId,this.smpl.chunkSize=n.chunkSize,this.smpl.dwManufacturer=this.readUInt32(t),this.smpl.dwProduct=this.readUInt32(t),this.smpl.dwSamplePeriod=this.readUInt32(t),this.smpl.dwMIDIUnityNote=this.readUInt32(t),this.smpl.dwMIDIPitchFraction=this.readUInt32(t),this.smpl.dwSMPTEFormat=this.readUInt32(t),this.smpl.dwSMPTEOffset=this.readUInt32(t),this.smpl.dwNumSampleLoops=this.readUInt32(t),this.smpl.dwSamplerData=this.readUInt32(t);for(let r=0;r<this.smpl.dwNumSampleLoops;r++)this.smpl.loops.push({dwName:this.readUInt32(t),dwType:this.readUInt32(t),dwStart:this.readUInt32(t),dwEnd:this.readUInt32(t),dwFraction:this.readUInt32(t),dwPlayCount:this.readUInt32(t)})}}readDataChunk_(t,n){let r=this.findChunk("data");if(r)this.data.chunkId="data",this.data.chunkSize=r.chunkSize,n&&(this.data.samples=t.slice(r.chunkData.start,r.chunkData.end));else throw Error('Could not find the "data" chunk')}readBextChunk_(t){let n=this.findChunk("bext");n&&(this.head=n.chunkData.start,this.bext.chunkId=n.chunkId,this.bext.chunkSize=n.chunkSize,this.bext.description=this.readString(t,256),this.bext.originator=this.readString(t,32),this.bext.originatorReference=this.readString(t,32),this.bext.originationDate=this.readString(t,10),this.bext.originationTime=this.readString(t,8),this.bext.timeReference=[this.readUInt32(t),this.readUInt32(t)],this.bext.version=this.readUInt16_(t),this.bext.UMID=this.readString(t,64),this.bext.loudnessValue=this.readUInt16_(t),this.bext.loudnessRange=this.readUInt16_(t),this.bext.maxTruePeakLevel=this.readUInt16_(t),this.bext.maxMomentaryLoudness=this.readUInt16_(t),this.bext.maxShortTermLoudness=this.readUInt16_(t),this.bext.reserved=this.readString(t,180),this.bext.codingHistory=this.readString(t,this.bext.chunkSize-602))}readiXMLChunk_(t){let n=this.findChunk("iXML");n&&(this.head=n.chunkData.start,this.iXML.chunkId=n.chunkId,this.iXML.chunkSize=n.chunkSize,this.iXML.value=Te(t,this.head,this.head+this.iXML.chunkSize))}readDs64Chunk_(t){let n=this.findChunk("ds64");if(n)this.head=n.chunkData.start,this.ds64.chunkId=n.chunkId,this.ds64.chunkSize=n.chunkSize,this.ds64.riffSizeHigh=this.readUInt32(t),this.ds64.riffSizeLow=this.readUInt32(t),this.ds64.dataSizeHigh=this.readUInt32(t),this.ds64.dataSizeLow=this.readUInt32(t),this.ds64.originationTime=this.readUInt32(t),this.ds64.sampleCountHigh=this.readUInt32(t),this.ds64.sampleCountLow=this.readUInt32(t);else if(this.container=="RF64")throw Error('Could not find the "ds64" chunk')}readLISTChunk_(t){let n=this.findChunk("LIST",!0);if(n!==null)for(let r=0;r<n.length;r++){let a=n[r];this.LIST.push({chunkId:a.chunkId,chunkSize:a.chunkSize,format:a.format,subChunks:[]});for(let o=0;o<a.subChunks.length;o++)this.readLISTSubChunks_(a.subChunks[o],a.format,t)}}readLISTSubChunks_(t,n,r){n=="adtl"?["labl","note","ltxt"].indexOf(t.chunkId)>-1&&this.readLISTadtlSubChunks_(r,t):n=="INFO"&&this.readLISTINFOSubChunks_(r,t)}readLISTadtlSubChunks_(t,n){this.head=n.chunkData.start;let r={chunkId:n.chunkId,chunkSize:n.chunkSize,dwName:this.readUInt32(t)};n.chunkId=="ltxt"?(r.dwSampleLength=this.readUInt32(t),r.dwPurposeID=this.readUInt32(t),r.dwCountry=this.readUInt16_(t),r.dwLanguage=this.readUInt16_(t),r.dwDialect=this.readUInt16_(t),r.dwCodePage=this.readUInt16_(t),r.value=""):r.value=this.readZSTR_(t,this.head),this.LIST[this.LIST.length-1].subChunks.push(r)}readLISTINFOSubChunks_(t,n){this.head=n.chunkData.start,this.LIST[this.LIST.length-1].subChunks.push({chunkId:n.chunkId,chunkSize:n.chunkSize,value:this.readZSTR_(t,this.head)})}readJunkChunk_(t){let n=this.findChunk("junk");n&&(this.junk={chunkId:n.chunkId,chunkSize:n.chunkSize,chunkData:[].slice.call(t.slice(n.chunkData.start,n.chunkData.end))})}read_PMXChunk_(t){let n=this.findChunk("_PMX");n&&(this.head=n.chunkData.start,this._PMX.chunkId=n.chunkId,this._PMX.chunkSize=n.chunkSize,this._PMX.value=Te(t,this.head,this.head+this._PMX.chunkSize))}readZSTR_(t,n=0){for(let r=n;r<t.length&&(this.head++,t[r]!==0);r++);return Te(t,n,this.head-1)}readUInt16_(t){let n=ve(t,this.uInt16,this.head);return this.head+=2,n}};function te(e,t){let n=C(e);for(let r=n.length;r<t;r++)n.push(0);return n}var Ct=class extends Lt{toBuffer(){this.uInt16.be=this.container==="RIFX",this.uInt32.be=this.uInt16.be;let t=[this.getJunkBytes_(),this.getDs64Bytes_(),this.getBextBytes_(),this.getiXMLBytes_(),this.getFmtBytes_(),this.getFactBytes_(),C(this.data.chunkId),S(this.data.samples.length,this.uInt32),this.data.samples,this.getCueBytes_(),this.getSmplBytes_(),this.getLISTBytes_(),this.get_PMXBytes_()],n=0;for(let o=0;o<t.length;o++)n+=t[o].length;let r=new Uint8Array(n+12),a=0;a=Vn(this.container,r,a),a=it(n+4,this.uInt32,r,a),a=Vn(this.format,r,a);for(let o=0;o<t.length;o++)r.set(t[o],a),a+=t[o].length;return r}getBextBytes_(){let t=[];return this.enforceBext_(),this.bext.chunkId&&(this.bext.chunkSize=602+this.bext.codingHistory.length,t=t.concat(C(this.bext.chunkId),S(602+this.bext.codingHistory.length,this.uInt32),te(this.bext.description,256),te(this.bext.originator,32),te(this.bext.originatorReference,32),te(this.bext.originationDate,10),te(this.bext.originationTime,8),S(this.bext.timeReference[0],this.uInt32),S(this.bext.timeReference[1],this.uInt32),S(this.bext.version,this.uInt16),te(this.bext.UMID,64),S(this.bext.loudnessValue,this.uInt16),S(this.bext.loudnessRange,this.uInt16),S(this.bext.maxTruePeakLevel,this.uInt16),S(this.bext.maxMomentaryLoudness,this.uInt16),S(this.bext.maxShortTermLoudness,this.uInt16),te(this.bext.reserved,180),te(this.bext.codingHistory,this.bext.codingHistory.length))),this.enforceByteLen_(t),t}enforceBext_(){for(let t in this.bext)if(this.bext.hasOwnProperty(t)&&this.bext[t]&&t!="timeReference"){this.bext.chunkId="bext";break}(this.bext.timeReference[0]||this.bext.timeReference[1])&&(this.bext.chunkId="bext")}getiXMLBytes_(){let t=[];if(this.iXML.chunkId){let n=C(this.iXML.value);this.iXML.chunkSize=n.length,t=t.concat(C(this.iXML.chunkId),S(this.iXML.chunkSize,this.uInt32),n)}return this.enforceByteLen_(t),t}getDs64Bytes_(){let t=[];return this.ds64.chunkId&&(t=t.concat(C(this.ds64.chunkId),S(this.ds64.chunkSize,this.uInt32),S(this.ds64.riffSizeHigh,this.uInt32),S(this.ds64.riffSizeLow,this.uInt32),S(this.ds64.dataSizeHigh,this.uInt32),S(this.ds64.dataSizeLow,this.uInt32),S(this.ds64.originationTime,this.uInt32),S(this.ds64.sampleCountHigh,this.uInt32),S(this.ds64.sampleCountLow,this.uInt32))),this.enforceByteLen_(t),t}getCueBytes_(){let t=[];if(this.cue.chunkId){let n=this.getCuePointsBytes_();t=t.concat(C(this.cue.chunkId),S(n.length+4,this.uInt32),S(this.cue.dwCuePoints,this.uInt32),n)}return this.enforceByteLen_(t),t}getCuePointsBytes_(){let t=[];for(let n=0;n<this.cue.dwCuePoints;n++)t=t.concat(S(this.cue.points[n].dwName,this.uInt32),S(this.cue.points[n].dwPosition,this.uInt32),C(this.cue.points[n].fccChunk),S(this.cue.points[n].dwChunkStart,this.uInt32),S(this.cue.points[n].dwBlockStart,this.uInt32),S(this.cue.points[n].dwSampleOffset,this.uInt32));return t}getSmplBytes_(){let t=[];if(this.smpl.chunkId){let n=this.getSmplLoopsBytes_();t=t.concat(C(this.smpl.chunkId),S(n.length+36,this.uInt32),S(this.smpl.dwManufacturer,this.uInt32),S(this.smpl.dwProduct,this.uInt32),S(this.smpl.dwSamplePeriod,this.uInt32),S(this.smpl.dwMIDIUnityNote,this.uInt32),S(this.smpl.dwMIDIPitchFraction,this.uInt32),S(this.smpl.dwSMPTEFormat,this.uInt32),S(this.smpl.dwSMPTEOffset,this.uInt32),S(this.smpl.dwNumSampleLoops,this.uInt32),S(this.smpl.dwSamplerData,this.uInt32),n)}return this.enforceByteLen_(t),t}getSmplLoopsBytes_(){let t=[];for(let n=0;n<this.smpl.dwNumSampleLoops;n++)t=t.concat(S(this.smpl.loops[n].dwName,this.uInt32),S(this.smpl.loops[n].dwType,this.uInt32),S(this.smpl.loops[n].dwStart,this.uInt32),S(this.smpl.loops[n].dwEnd,this.uInt32),S(this.smpl.loops[n].dwFraction,this.uInt32),S(this.smpl.loops[n].dwPlayCount,this.uInt32));return t}getFactBytes_(){let t=[];return this.fact.chunkId&&(t=t.concat(C(this.fact.chunkId),S(this.fact.chunkSize,this.uInt32),S(this.fact.dwSampleLength,this.uInt32))),this.enforceByteLen_(t),t}getFmtBytes_(){let t=[];if(this.fmt.chunkId){let n=t.concat(C(this.fmt.chunkId),S(this.fmt.chunkSize,this.uInt32),S(this.fmt.audioFormat,this.uInt16),S(this.fmt.numChannels,this.uInt16),S(this.fmt.sampleRate,this.uInt32),S(this.fmt.byteRate,this.uInt32),S(this.fmt.blockAlign,this.uInt16),S(this.fmt.bitsPerSample,this.uInt16),this.getFmtExtensionBytes_());return this.enforceByteLen_(n),n}throw Error('Could not find the "fmt " chunk')}getFmtExtensionBytes_(){let t=[];return this.fmt.chunkSize>16&&(t=t.concat(S(this.fmt.cbSize,this.uInt16))),this.fmt.chunkSize>18&&(t=t.concat(S(this.fmt.validBitsPerSample,this.uInt16))),this.fmt.chunkSize>20&&(t=t.concat(S(this.fmt.dwChannelMask,this.uInt32))),this.fmt.chunkSize>24&&(t=t.concat(S(this.fmt.subformat[0],this.uInt32),S(this.fmt.subformat[1],this.uInt32),S(this.fmt.subformat[2],this.uInt32),S(this.fmt.subformat[3],this.uInt32))),t}getLISTBytes_(){let t=[];for(let n=0;n<this.LIST.length;n++){let r=this.getLISTSubChunksBytes_(this.LIST[n].subChunks,this.LIST[n].format);t=t.concat(C(this.LIST[n].chunkId),S(r.length+4,this.uInt32),C(this.LIST[n].format),r)}return this.enforceByteLen_(t),t}getLISTSubChunksBytes_(t,n){let r=[];for(let a=0,o=t.length;a<o;a++)n=="INFO"?r=r.concat(this.getLISTINFOSubChunksBytes_(t[a])):n=="adtl"&&(r=r.concat(this.getLISTadtlSubChunksBytes_(t[a]))),this.enforceByteLen_(r);return r}getLISTINFOSubChunksBytes_(t){let n=[],r=te(t.value,t.value.length);return n=n.concat(C(t.chunkId),S(r.length+1,this.uInt32),r),n.push(0),n}getLISTadtlSubChunksBytes_(t){let n=[];if(["labl","note"].indexOf(t.chunkId)>-1){let r=te(t.value,t.value.length);n=n.concat(C(t.chunkId),S(r.length+4+1,this.uInt32),S(t.dwName,this.uInt32),r),n.push(0)}else t.chunkId=="ltxt"&&(n=n.concat(this.getLtxtChunkBytes_(t)));return n}getLtxtChunkBytes_(t){return[].concat(C(t.chunkId),S(t.value.length+20,this.uInt32),S(t.dwName,this.uInt32),S(t.dwSampleLength,this.uInt32),S(t.dwPurposeID,this.uInt32),S(t.dwCountry,this.uInt16),S(t.dwLanguage,this.uInt16),S(t.dwDialect,this.uInt16),S(t.dwCodePage,this.uInt16),te(t.value,t.value.length))}get_PMXBytes_(){let t=[];if(this._PMX.chunkId){let n=C(this._PMX.value);this._PMX.chunkSize=n.length,t=t.concat(C(this._PMX.chunkId),S(this._PMX.chunkSize,this.uInt32),n)}return this.enforceByteLen_(t),t}getJunkBytes_(){let t=[];return this.junk.chunkId?t.concat(C(this.junk.chunkId),S(this.junk.chunkData.length,this.uInt32),this.junk.chunkData):(this.enforceByteLen_(t),t)}enforceByteLen_(t){t.length%2&&t.push(0)}};function Ma(e){let t=[];if(e.length>0)if(e[0].constructor!==Number){t=new Float64Array(e[0].length*e.length);for(let n=0,r=e[0].length,a=0;n<r;n++)for(let o=0,i=e.length;o<i;o++,a++)t[a]=e[o][n]}else t=e;return t}function ka(e,t,n=Float64Array){let r=[];for(let a=0;a<t;a++)r[a]=new n(e.length/t);for(let a=0;a<t;a++)for(let o=a,i=0;o<e.length;o+=t,i++)r[a][i]=e[o];return r}function Na(e,t){let n=e*t/8;return!(e<1||n>65535)}function Rt(e,t,n){let r=e*(t/8)*n;return!(n<1||r>4294967295)}var Pt=class extends Ct{constructor(){super(),this.bitDepth="0",this.dataType={bits:0,be:!1},this.WAV_AUDIO_FORMATS={4:17,8:1,"8a":6,"8m":7,16:1,24:1,32:1,"32f":3,64:3}}fromScratch(t,n,r,a,o){o=o||{},this.clearHeaders(),this.newWavFile_(t,n,r,a,o)}fromBuffer(t,n=!0){super.fromBuffer(t,n),this.bitDepthFromFmt_(),this.updateDataType_()}toBuffer(){return this.validateWavHeader_(),super.toBuffer()}getSamples(t=!1,n=Float64Array){let r=new n(this.data.samples.length/(this.dataType.bits/8));return ye(this.data.samples,this.dataType,r,0,this.data.samples.length),!t&&this.fmt.numChannels>1?ka(r,this.fmt.numChannels,n):r}getSample(t){if(t=t*(this.dataType.bits/8),t+this.dataType.bits/8>this.data.samples.length)throw new Error("Range error");return ve(this.data.samples.slice(t,t+this.dataType.bits/8),this.dataType)}setSample(t,n){if(t=t*(this.dataType.bits/8),t+this.dataType.bits/8>this.data.samples.length)throw new Error("Range error");it(n,this.dataType,this.data.samples,t)}getiXML(){return this.iXML.value}setiXML(t){if(typeof t!="string")throw new TypeError("iXML value must be a string.");this.iXML.value=t,this.iXML.chunkId="iXML"}get_PMX(){return this._PMX.value}set_PMX(t){if(typeof t!="string")throw new TypeError("_PMX value must be a string.");this._PMX.value=t,this._PMX.chunkId="_PMX"}newWavFile_(t,n,r,a,o){o.container||(o.container="RIFF"),this.container=o.container,this.bitDepth=r,a=Ma(a),this.updateDataType_();let i=this.dataType.bits/8;this.data.samples=new Uint8Array(a.length*i),zn(a,this.dataType,this.data.samples,0),this.makeWavHeader_(r,t,n,i,this.data.samples.length,o),this.data.chunkId="data",this.data.chunkSize=this.data.samples.length,this.validateWavHeader_()}makeWavHeader_(t,n,r,a,o,i){t=="4"?this.createADPCMHeader_(t,n,r,a,o,i):t=="8a"||t=="8m"?this.createALawMulawHeader_(t,n,r,a,o,i):Object.keys(this.WAV_AUDIO_FORMATS).indexOf(t)==-1||n>2?this.createExtensibleHeader_(t,n,r,a,o,i):this.createPCMHeader_(t,n,r,a,o,i)}createPCMHeader_(t,n,r,a,o,i){this.container=i.container,this.chunkSize=36+o,this.format="WAVE",this.bitDepth=t,this.fmt={chunkId:"fmt ",chunkSize:16,audioFormat:this.WAV_AUDIO_FORMATS[t]||65534,numChannels:n,sampleRate:r,byteRate:n*a*r,blockAlign:n*a,bitsPerSample:parseInt(t,10),cbSize:0,validBitsPerSample:0,dwChannelMask:0,subformat:[]}}createADPCMHeader_(t,n,r,a,o,i){this.createPCMHeader_(t,n,r,a,o,i),this.chunkSize=40+o,this.fmt.chunkSize=20,this.fmt.byteRate=4055,this.fmt.blockAlign=256,this.fmt.bitsPerSample=4,this.fmt.cbSize=2,this.fmt.validBitsPerSample=505,this.fact={chunkId:"fact",chunkSize:4,dwSampleLength:o*2}}createExtensibleHeader_(t,n,r,a,o,i){this.createPCMHeader_(t,n,r,a,o,i),this.chunkSize=60+o,this.fmt.chunkSize=40,this.fmt.bitsPerSample=(parseInt(t,10)-1|7)+1,this.fmt.cbSize=22,this.fmt.validBitsPerSample=parseInt(t,10),this.fmt.dwChannelMask=ud(n),this.fmt.subformat=[1,1048576,2852126848,1905997824]}createALawMulawHeader_(t,n,r,a,o,i){this.createPCMHeader_(t,n,r,a,o,i),this.chunkSize=40+o,this.fmt.chunkSize=20,this.fmt.cbSize=2,this.fmt.validBitsPerSample=8,this.fact={chunkId:"fact",chunkSize:4,dwSampleLength:o}}bitDepthFromFmt_(){this.fmt.audioFormat===3&&this.fmt.bitsPerSample===32?this.bitDepth="32f":this.fmt.audioFormat===6?this.bitDepth="8a":this.fmt.audioFormat===7?this.bitDepth="8m":this.bitDepth=this.fmt.bitsPerSample.toString()}validateBitDepth_(){if(!this.WAV_AUDIO_FORMATS[this.bitDepth]){if(parseInt(this.bitDepth,10)>8&&parseInt(this.bitDepth,10)<54)return!0;throw new Error("Invalid bit depth.")}return!0}updateDataType_(){this.dataType={bits:(parseInt(this.bitDepth,10)-1|7)+1,fp:this.bitDepth=="32f"||this.bitDepth=="64",signed:this.bitDepth!="8",be:this.container=="RIFX"},["4","8a","8m"].indexOf(this.bitDepth)>-1&&(this.dataType.bits=8,this.dataType.signed=!1)}validateWavHeader_(){if(this.validateBitDepth_(),!Na(this.fmt.numChannels,this.fmt.bitsPerSample))throw new Error("Invalid number of channels.");if(!Rt(this.fmt.numChannels,this.fmt.bitsPerSample,this.fmt.sampleRate))throw new Error("Invalid sample rate.")}};function ud(e){let t=0;return e===1?t=4:e===2?t=3:e===4?t=51:e===6?t=63:e===8&&(t=1599),t}var Dt=class extends Pt{getTag(t){let n=this.getTagIndex_(t);return n.TAG!==null?this.LIST[n.LIST].subChunks[n.TAG].value:null}setTag(t,n){t=pd(t);let r=this.getTagIndex_(t);r.TAG!==null?(this.LIST[r.LIST].subChunks[r.TAG].chunkSize=n.length+1,this.LIST[r.LIST].subChunks[r.TAG].value=n):r.LIST!==null?this.LIST[r.LIST].subChunks.push({chunkId:t,chunkSize:n.length+1,value:n}):(this.LIST.push({chunkId:"LIST",chunkSize:8+n.length+1,format:"INFO",subChunks:[]}),this.LIST[this.LIST.length-1].subChunks.push({chunkId:t,chunkSize:n.length+1,value:n}))}deleteTag(t){let n=this.getTagIndex_(t);return n.TAG!==null?(this.LIST[n.LIST].subChunks.splice(n.TAG,1),!0):!1}listTags(){let t=this.getLISTIndex("INFO"),n={};if(t!==null)for(let r=0,a=this.LIST[t].subChunks.length;r<a;r++)n[this.LIST[t].subChunks[r].chunkId]=this.LIST[t].subChunks[r].value;return n}getLISTIndex(t){for(let n=0,r=this.LIST.length;n<r;n++)if(this.LIST[n].format==t)return n;return null}getTagIndex_(t){let n={LIST:null,TAG:null};for(let r=0,a=this.LIST.length;r<a;r++)if(this.LIST[r].format=="INFO"){n.LIST=r;for(let o=0,i=this.LIST[r].subChunks.length;o<i;o++)if(this.LIST[r].subChunks[o].chunkId==t){n.TAG=o;break}break}return n}};function pd(e){if(e.constructor!==String)throw new Error("Invalid tag name.");if(e.length<4)for(let t=0,n=4-e.length;t<n;t++)e+=" ";return e}var lt=class extends Dt{listCuePoints(){let t=this.getCuePoints_();for(let n=0,r=t.length;n<r;n++)t[n].position=t[n].dwSampleOffset/this.fmt.sampleRate*1e3,t[n].dwSampleLength?(t[n].end=t[n].dwSampleLength/this.fmt.sampleRate*1e3,t[n].end+=t[n].position):t[n].end=null,delete t[n].value;return t}setCuePoint(t){this.cue.chunkId="cue ",t.label||(t.label="");let n=this.getCuePoints_();this.clearLISTadtl_(),this.cue.points=[],t.dwSampleOffset=t.position*this.fmt.sampleRate/1e3,t.dwSampleLength=0,t.end&&(t.dwSampleLength=t.end*this.fmt.sampleRate/1e3-t.dwSampleOffset),n.length===0?this.setCuePoint_(t,1):this.setCuePointInOrder_(n,t),this.cue.dwCuePoints=this.cue.points.length}deleteCuePoint(t){this.cue.chunkId="cue ";let n=this.getCuePoints_();this.clearLISTadtl_();let r=this.cue.points.length;this.cue.points=[];for(let a=0;a<r;a++)a+1!==t&&this.setCuePoint_(n[a],a+1);this.cue.dwCuePoints=this.cue.points.length,this.cue.dwCuePoints?this.cue.chunkId="cue ":(this.cue.chunkId="",this.clearLISTadtl_())}updateLabel(t,n){let r=this.getLISTIndex("adtl");if(r!==null)for(let a=0,o=this.LIST[r].subChunks.length;a<o;a++)this.LIST[r].subChunks[a].dwName==t&&(this.LIST[r].subChunks[a].value=n)}getCuePoints_(){let t=[];for(let n=0;n<this.cue.points.length;n++){let r=this.cue.points[n],a=this.getDataForCuePoint_(r.dwName);a.label=a.value?a.value:"",a.dwPosition=r.dwPosition,a.fccChunk=r.fccChunk,a.dwChunkStart=r.dwChunkStart,a.dwBlockStart=r.dwBlockStart,a.dwSampleOffset=r.dwSampleOffset,t.push(a)}return t}getDataForCuePoint_(t){let n=this.getLISTIndex("adtl"),r={};return n!==null&&this.getCueDataFromLIST_(r,n,t),r}getCueDataFromLIST_(t,n,r){for(let a=0,o=this.LIST[n].subChunks.length;a<o;a++)if(this.LIST[n].subChunks[a].dwName==r){let i=this.LIST[n].subChunks[a];t.value=i.value||t.value,t.dwName=i.dwName||0,t.dwSampleLength=i.dwSampleLength||0,t.dwPurposeID=i.dwPurposeID||0,t.dwCountry=i.dwCountry||0,t.dwLanguage=i.dwLanguage||0,t.dwDialect=i.dwDialect||0,t.dwCodePage=i.dwCodePage||0}}setCuePoint_(t,n){this.cue.points.push({dwName:n,dwPosition:t.dwPosition?t.dwPosition:0,fccChunk:t.fccChunk?t.fccChunk:"data",dwChunkStart:t.dwChunkStart?t.dwChunkStart:0,dwBlockStart:t.dwBlockStart?t.dwBlockStart:0,dwSampleOffset:t.dwSampleOffset}),this.setLabl_(t,n)}setCuePointInOrder_(t,n){let r=!1;for(let a=0;a<t.length;a++)t[a].dwSampleOffset>n.dwSampleOffset&&!r?(this.setCuePoint_(n,a+1),this.setCuePoint_(t[a],a+2),r=!0):this.setCuePoint_(t[a],r?a+2:a+1);r||this.setCuePoint_(n,this.cue.points.length+1)}clearLISTadtl_(){for(let t=0,n=this.LIST.length;t<n;t++)this.LIST[t].format=="adtl"&&this.LIST.splice(t)}setLabl_(t,n){let r=this.getLISTIndex("adtl");r===null&&(this.LIST.push({chunkId:"LIST",chunkSize:4,format:"adtl",subChunks:[]}),r=this.LIST.length-1),this.setLabelText_(r,t,n),t.dwSampleLength&&this.setLtxtChunk_(r,t,n)}setLabelText_(t,n,r){this.LIST[t].subChunks.push({chunkId:"labl",chunkSize:4,dwName:r,value:n.label}),this.LIST[t].chunkSize+=12}setLtxtChunk_(t,n,r){this.LIST[t].subChunks.push({chunkId:"ltxt",chunkSize:20,dwName:r,dwSampleLength:n.dwSampleLength,dwPurposeID:n.dwPurposeID||0,dwCountry:n.dwCountry||0,dwLanguage:n.dwLanguage||0,dwDialect:n.dwDialect||0,dwCodePage:n.dwCodePage||0,value:n.label}),this.LIST[t].chunkSize+=28}};var Ut=class{constructor(t,n,r){this.length_=t,this.scaleFactor_=(t-1)/n,this.interpolate=this.sinc,r.method==="point"?this.interpolate=this.point:r.method==="linear"?this.interpolate=this.linear:r.method==="cubic"&&(this.interpolate=this.cubic),this.tangentFactor_=1-Math.max(0,Math.min(1,r.tension||0)),this.sincFilterSize_=r.sincFilterSize||1,this.kernel_=md(r.sincWindow||cd)}point(t,n){return this.getClippedInput_(Math.round(this.scaleFactor_*t),n)}linear(t,n){t=this.scaleFactor_*t;let r=Math.floor(t);return t-=r,(1-t)*this.getClippedInput_(r,n)+t*this.getClippedInput_(r+1,n)}cubic(t,n){t=this.scaleFactor_*t;let r=Math.floor(t),a=[this.getTangent_(r,n),this.getTangent_(r+1,n)],o=[this.getClippedInput_(r,n),this.getClippedInput_(r+1,n)];t-=r;let i=t*t,l=t*i;return(2*l-3*i+1)*o[0]+(l-2*i+t)*a[0]+(-2*l+3*i)*o[1]+(l-i)*a[1]}sinc(t,n){t=this.scaleFactor_*t;let r=Math.floor(t),a=r-this.sincFilterSize_+1,o=r+this.sincFilterSize_,i=0;for(let l=a;l<=o;l++)i+=this.kernel_(t-l)*this.getClippedInput_(l,n);return i}getTangent_(t,n){return this.tangentFactor_*(this.getClippedInput_(t+1,n)-this.getClippedInput_(t-1,n))/2}getClippedInput_(t,n){return 0<=t&&t<this.length_?n[t]:0}};function cd(e){return Math.exp(-e/2*e/2)}function md(e){return function(t){return hd(t)*e(t)}}function hd(e){return e===0?1:Math.sin(Math.PI*e)/(Math.PI*e)}var Bt=class{constructor(t,n,r){let a=2*Math.PI*r/n,o=0;this.filters=[];for(let i=0;i<=t;i++)i-t/2===0?this.filters[i]=a:(this.filters[i]=Math.sin(a*(i-t/2))/(i-t/2),this.filters[i]*=.54-.46*Math.cos(2*Math.PI*i/t)),o=o+this.filters[i];for(let i=0;i<=t;i++)this.filters[i]/=o;this.z=this.initZ_()}filter(t){this.z.buf[this.z.pointer]=t;let n=0;for(let r=0,a=this.z.buf.length;r<a;r++)n+=this.filters[r]*this.z.buf[(this.z.pointer+r)%this.z.buf.length];return this.z.pointer=(this.z.pointer+1)%this.z.buf.length,n}reset(){this.z=this.initZ_()}initZ_(){let t=[];for(let n=0;n<this.filters.length-1;n++)t.push(0);return{buf:t,pointer:0}}};var Wt=class{constructor(t,n,r){let a=[];for(let o=0;o<t;o++)a.push(this.getCoeffs_({Fs:n,Fc:r,Q:.5/Math.sin(Math.PI/(t*2)*(o+.5))}));this.stages=[];for(let o=0;o<a.length;o++)this.stages[o]={b0:a[o].b[0],b1:a[o].b[1],b2:a[o].b[2],a1:a[o].a[0],a2:a[o].a[1],k:a[o].k,z:[0,0]}}filter(t){let n=t;for(let r=0,a=this.stages.length;r<a;r++)n=this.runStage_(r,n);return n}getCoeffs_(t){let n={};n.a=[],n.b=[];let r=this.preCalc_(t,n);return n.k=1,n.b.push((1-r.cw)/(2*r.a0)),n.b.push(2*n.b[0]),n.b.push(n.b[0]),n}preCalc_(t,n){let r={},a=2*Math.PI*t.Fc/t.Fs;return r.alpha=Math.sin(a)/(2*t.Q),r.cw=Math.cos(a),r.a0=1+r.alpha,n.a0=r.a0,n.a.push(-2*r.cw/r.a0),n.k=1,n.a.push((1-r.alpha)/r.a0),r}runStage_(t,n){let r=n*this.stages[t].k-this.stages[t].a1*this.stages[t].z[0]-this.stages[t].a2*this.stages[t].z[1],a=this.stages[t].b0*r+this.stages[t].b1*this.stages[t].z[0]+this.stages[t].b2*this.stages[t].z[1];return this.stages[t].z[1]=this.stages[t].z[0],this.stages[t].z[0]=r,a}reset(){for(let t=0;t<this.stages.length;t++)this.stages[t].z=[0,0]}};var fd={point:!1,linear:!1,cubic:!0,sinc:!0},Fa={IIR:16,FIR:71},gd={IIR:Wt,FIR:Bt};function Gn(e,t,n,r=null){r=r||{};let a=(n-t)/t+1,o=new Float64Array(e.length*a);r.method=r.method||"cubic";let i=new Ut(e.length,o.length,{method:r.method,tension:r.tension||0,sincFilterSize:r.sincFilterSize||6,sincWindow:r.sincWindow||void 0,clip:r.clip||"mirror"});if(r.LPF===void 0&&(r.LPF=fd[r.method]),r.LPF){r.LPFType=r.LPFType||"IIR";let l=gd[r.LPFType];if(n>t){let d=new l(r.LPForder||Fa[r.LPFType],n,t/2);yd(e,o,i,d)}else{let d=new l(r.LPForder||Fa[r.LPFType],t,n/2);$d(e,o,i,d)}}else va(e,o,i);return o}function va(e,t,n){for(let r=0,a=t.length;r<a;r++)t[r]=n.interpolate(r,e)}function yd(e,t,n,r){for(let a=0,o=t.length;a<o;a++)t[a]=r.filter(n.interpolate(a,e));r.reset();for(let a=t.length-1;a>=0;a--)t[a]=r.filter(t[a])}function $d(e,t,n,r){for(let a=0,o=e.length;a<o;a++)e[a]=r.filter(e[a]);r.reset();for(let a=e.length-1;a>=0;a--)e[a]=r.filter(e[a]);va(e,t,n)}var Vt=class extends lt{toRIFF(){let t=new Float64Array(dt(this.data.samples.length,this.dataType.bits/8));ye(this.data.samples,this.dataType,t,0,this.data.samples.length),this.fromExisting_(this.fmt.numChannels,this.fmt.sampleRate,this.bitDepth,t,{container:"RIFF"})}toRIFX(){let t=new Float64Array(dt(this.data.samples.length,this.dataType.bits/8));ye(this.data.samples,this.dataType,t,0,this.data.samples.length),this.fromExisting_(this.fmt.numChannels,this.fmt.sampleRate,this.bitDepth,t,{container:"RIFX"})}toIMAADPCM(){if(this.fmt.sampleRate!==8e3)throw new Error("Only 8000 Hz files can be compressed as IMA-ADPCM.");if(this.fmt.numChannels!==1)throw new Error("Only mono files can be compressed as IMA-ADPCM.");{this.assure16Bit_();let t=new Int16Array(dt(this.data.samples.length,2));ye(this.data.samples,this.dataType,t,0,this.data.samples.length),this.fromExisting_(this.fmt.numChannels,this.fmt.sampleRate,"4",$a(t),{container:this.correctContainer_()})}}fromIMAADPCM(t="16"){this.fromExisting_(this.fmt.numChannels,this.fmt.sampleRate,"16",Sa(this.data.samples,this.fmt.blockAlign),{container:this.correctContainer_()}),t!="16"&&this.toBitDepth(t)}toALaw(){this.assure16Bit_();let t=new Int16Array(dt(this.data.samples.length,2));ye(this.data.samples,this.dataType,t,0,this.data.samples.length),this.fromExisting_(this.fmt.numChannels,this.fmt.sampleRate,"8a",Ia(t),{container:this.correctContainer_()})}fromALaw(t="16"){this.fromExisting_(this.fmt.numChannels,this.fmt.sampleRate,"16",ba(this.data.samples),{container:this.correctContainer_()}),t!="16"&&this.toBitDepth(t)}toMuLaw(){this.assure16Bit_();let t=new Int16Array(dt(this.data.samples.length,2));ye(this.data.samples,this.dataType,t,0,this.data.samples.length),this.fromExisting_(this.fmt.numChannels,this.fmt.sampleRate,"8m",wa(t),{container:this.correctContainer_()})}fromMuLaw(t="16"){this.fromExisting_(this.fmt.numChannels,this.fmt.sampleRate,"16",Ta(this.data.samples),{container:this.correctContainer_()}),t!="16"&&this.toBitDepth(t)}toBitDepth(t,n=!0){let r=t,a=this.bitDepth;n||(t!="32f"&&(r=this.dataType.bits.toString()),a=""+this.dataType.bits),this.assureUncompressed_();let o=this.getSamples(!0),i=new Float64Array(o.length);fa(o,a,i,r),this.fromExisting_(this.fmt.numChannels,this.fmt.sampleRate,t,i,{container:this.correctContainer_()})}toSampleRate(t,n){this.validateResample_(t);let r=this.getSamples(),a=[];if(r.constructor===Float64Array)a=Gn(r,this.fmt.sampleRate,t,n);else for(let o=0;o<r.length;o++)a.push(Gn(r[o],this.fmt.sampleRate,t,n));this.fromExisting_(this.fmt.numChannels,t,this.bitDepth,a,{container:this.correctContainer_()})}validateResample_(t){if(Rt(this.fmt.numChannels,this.fmt.bitsPerSample,t)){if(["4","8a","8m"].indexOf(this.bitDepth)>-1)throw new Error("wavefile can't change the sample rate of compressed files.")}else throw new Error("Invalid sample rate.")}assure16Bit_(){this.assureUncompressed_(),this.bitDepth!="16"&&this.toBitDepth("16")}assureUncompressed_(){this.bitDepth=="8a"?this.fromALaw():this.bitDepth=="8m"?this.fromMuLaw():this.bitDepth=="4"&&this.fromIMAADPCM()}correctContainer_(){return this.container=="RF64"?"RIFF":this.container}fromExisting_(t,n,r,a,o){let i=new lt;Object.assign(this.fmt,i.fmt),Object.assign(this.fact,i.fact),Object.assign(this.ds64,i.ds64),Object.assign(this.data,i.data),this.newWavFile_(t,n,r,a,o)}};function dt(e,t){let n=e/t;return n%2&&n++,n}var zt=class extends Vt{constructor(t){super(),t&&this.fromBuffer(t)}fromBase64(t){this.fromBuffer(ca(t))}toBase64(){return pa(this.toBuffer())}toDataURI(){return"data:audio/wav;base64,"+this.toBase64()}fromDataURI(t){this.fromBase64(t.replace("data:audio/wav;base64,",""))}};var $e=({refs:e,cache:t})=>{t.wasmOutput=ie(e.rawModule,t.arrayType,e.rawModule.globals.core.x_getOutput()),t.wasmInput=ie(e.rawModule,t.arrayType,e.rawModule.globals.core.x_getInput())},Ea=e=>{let{refs:t,cache:n,metadata:r}=e;return{initialize:{type:"proxy",value:(a,o)=>{r.settings.audio.blockSize=o,r.settings.audio.sampleRate=a,n.blockSize=o,t.rawModule.initialize(a,o),$e(e)}},dspLoop:{type:"proxy",value:(a,o)=>{for(let i=0;i<a.length;i++)n.wasmInput.set(a[i],i*n.blockSize);$e(e),t.rawModule.dspLoop(),$e(e);for(let i=0;i<o.length;i++)o[i].set(n.wasmOutput.subarray(n.blockSize*i,n.blockSize*(i+1)))}}}};var Oa=e=>{let{refs:t,cache:n}=e;return{getArray:{type:"proxy",value:r=>{let a=ot(t.rawModule,r),o=t.rawModule.globals.commons.getArray(a);return ie(t.rawModule,n.arrayType,o)}},setArray:{type:"proxy",value:(r,a)=>{let o=ot(t.rawModule,r),{arrayPointer:i}=On(t.rawModule,n.bitDepth,a);t.rawModule.globals.commons.setArray(o,i),$e(e)}}}};var Ee=(e,t)=>{let n=e.globals.msg.x_getTokenTypes(t),r=ie(e,Int32Array,n),a=[];return r.forEach((o,i)=>{if(o===e.globals.msg.FLOAT_TOKEN.valueOf())a.push(e.globals.msg.readFloatToken(t,i));else if(o===e.globals.msg.STRING_TOKEN.valueOf()){let l=e.globals.msg.readStringToken(t,i);a.push(ee(e,l))}}),a},La=(e,t)=>{let n=t.reduce((i,l)=>{if(typeof l=="number")i.push(e.globals.msg.FLOAT_TOKEN.valueOf());else if(typeof l=="string")i.push(e.globals.msg.STRING_TOKEN.valueOf()),i.push(l.length);else throw new Error(`invalid message value ${l}`);return i},[]),r=e.globals.msg.x_createTemplate(n.length);ie(e,Int32Array,r).set(n);let o=e.globals.msg.x_create(r);return t.forEach((i,l)=>{if(typeof i=="number")e.globals.msg.writeFloatToken(o,l,i);else if(typeof i=="string"){let d=ot(e,i);e.globals.msg.writeStringToken(o,l,d)}}),o};var Ca=({metadata:e,refs:t})=>Object.entries(e.settings.io.messageReceivers).reduce((n,[r,a])=>({...n,[r]:{type:"proxy",value:A(a,o=>[o,i=>{let l=La(t.rawModule,i);t.rawModule.io.messageReceivers[r][o](l)}])}}),{}),Ra=({metadata:e})=>Object.entries(e.settings.io.messageSenders).reduce((t,[n,r])=>({...t,[n]:{type:"proxy",value:A(r,a=>[a,o=>{}])}}),{}),Pa=({metadata:e,refs:t})=>{let n={},{variableNamesIndex:r}=e.compilation;return Object.entries(e.settings.io.messageSenders).forEach(([a,o])=>{o.forEach(i=>{let l=r.io.messageSenders[a][i];n[l]=d=>{let p=Ee(t.rawModule,d);t.engine.io.messageSenders[a][i](p)}})}),n};var Da=e=>{let{refs:t,cache:n,metadata:r}=e,a=r.compilation.variableNamesIndex.globals.fs;return{sendReadSoundFileResponse:{type:"proxy",value:"x_onReadSoundFileResponse"in a?(o,i,l)=>{let d=0;l&&(d=Ln(t.rawModule,n.bitDepth,l)),t.rawModule.globals.fs.x_onReadSoundFileResponse(o,i,d),$e(e)}:void 0},sendWriteSoundFileResponse:{type:"proxy",value:"x_onWriteSoundFileResponse"in a?t.rawModule.globals.fs.x_onWriteSoundFileResponse:void 0},sendSoundStreamData:{type:"proxy",value:"x_onSoundStreamData"in a?(o,i)=>{let l=Ln(t.rawModule,n.bitDepth,i),d=t.rawModule.globals.fs.x_onSoundStreamData(o,l);return $e(e),d}:void 0},closeSoundStream:{type:"proxy",value:"x_onCloseSoundStream"in a?t.rawModule.globals.fs.x_onCloseSoundStream:void 0},onReadSoundFile:{type:"callback",value:()=>{}},onWriteSoundFile:{type:"callback",value:()=>{}},onOpenSoundReadStream:{type:"callback",value:()=>{}},onOpenSoundWriteStream:{type:"callback",value:()=>{}},onSoundStreamData:{type:"callback",value:()=>{}},onCloseSoundStream:{type:"callback",value:()=>{}}}},Ua=e=>{let t={},{cache:n,metadata:r,refs:a}=e,o=r.compilation.variableNamesIndex.globals;if("fs"in o){let i=kt(t,o.fs);"i_readSoundFile"in o.fs&&(i.i_readSoundFile=(l,d,p)=>{let m=ee(a.rawModule,d),$=Ee(a.rawModule,p);a.engine.globals.fs.onReadSoundFile(l,m,$)}),"i_writeSoundFile"in o.fs&&(i.i_writeSoundFile=(l,d,p,m)=>{let $=Cn(a.rawModule,n.bitDepth,d),M=ee(a.rawModule,p),x=Ee(a.rawModule,m);a.engine.globals.fs.onWriteSoundFile(l,$,M,x)}),"i_openSoundReadStream"in o.fs&&(i.i_openSoundReadStream=(l,d,p)=>{let m=ee(a.rawModule,d),$=Ee(a.rawModule,p);$e(e),a.engine.globals.fs.onOpenSoundReadStream(l,m,$)}),"i_openSoundWriteStream"in o.fs&&(i.i_openSoundWriteStream=(l,d,p)=>{let m=ee(a.rawModule,d),$=Ee(a.rawModule,p);a.engine.globals.fs.onOpenSoundWriteStream(l,m,$)}),"i_sendSoundStreamData"in o.fs&&(i.i_sendSoundStreamData=(l,d)=>{let p=Cn(a.rawModule,n.bitDepth,d);a.engine.globals.fs.onSoundStreamData(l,p)}),"i_closeSoundStream"in o.fs&&(i.i_closeSoundStream=(...l)=>a.engine.globals.fs.onCloseSoundStream(...l))}return t};var Ba=async(e,t)=>{let n=await Ft(e),r=n.settings.audio.bitDepth,a=ge(r),o={refs:{},metadata:n,cache:{wasmOutput:new a(0),wasmInput:new a(0),arrayType:a,bitDepth:r,blockSize:0}},i={...Ua(o),...Pa(o)},l=await Nt(e,{input:i});o.refs.rawModule=Mt(l.exports,n.compilation.variableNamesIndex);let d=Sd(o),p=H(o.refs.rawModule,{...d,...t||{}});return o.refs.engine=p,p},Sd=e=>{let{metadata:t,refs:n}=e,r=t.compilation.variableNamesIndex.globals,a={messageReceivers:H(n.rawModule,Ca(e)),messageSenders:H(n.rawModule,Ra(e))},o={commons:{type:"proxy",value:H(n.rawModule,Oa(e))}};if("fs"in r){let i=H(n.rawModule,Da(e));o.fs={type:"proxy",value:i}}return{...Ea(e),metadata:{type:"proxy",value:t},globals:{type:"proxy",value:H(n.rawModule,o)},io:{type:"proxy",value:a}}};var Wa=async(e,t,n)=>{let r="assemblyscript";if(!t.wasm&&!t.javascript)throw new Error("Need compiled wasm or compiled js to render wav");t.wasm||(r="javascript");let a=await bd(t,r),o=await wd(a,e,n);return Id(o,n.sampleRate)},Id=(e,t)=>{let n=e.length,r=new zt;return r.fromScratch(n,t,"32f",e.map(a=>a.map(o=>o))),r.toBuffer()},bd=async(e,t)=>{switch(t){case"javascript":return vt(et(e,"javascript"));case"assemblyscript":return Ba(et(e,"wasm"))}},wd=(e,t,n)=>{let{channelCount:r,sampleRate:a,blockSize:o}=n,i=Math.round(t*a),l=jn("in",n),d=jn("out",n),p=jn("out",n,i);e.initialize(a,o);let m=0;for(;m<i;){e.dspLoop(l,d);for(let $=0;$<r.out;$++)p[$].set(d[$].slice(0,Math.min(o,i-m)),m);m+=o}return p},jn=(e,t,n)=>{let{channelCount:r,blockSize:a,bitDepth:o}=t;n===void 0&&(n=a);let i=ge(o),l=[];for(let d=0;d<r[e];d++)l.push(new i(Math.round(n)));return l};var Td=["pd","pdJson","dspGraph",[["javascript","wav"],["assemblyscript","wasm","wav"],["assemblyscript","wasm","app"],["javascript","app"]]];var Kn=(e,t,n)=>{let r=Va(Td,t,[]).filter(a=>a.includes(e)).map(a=>a.slice(a.indexOf(e)+1));return n&&n!==e&&(r=r.filter(a=>a.includes(n))),r.length===0?null:r[0]};var Va=(e,t,n)=>{let r=[...n];return e.flatMap(a=>Array.isArray(a)?Va(a,t,r):(r=[...r,a],a===t?[r]:[]))};var za={translateArgs:(e,t)=>{let n;if(e.args.length)n=e.args.map(r=>G(r)-1);else{let r=new Set;t.connections.forEach(o=>{o.sink.nodeId===e.id&&r.add(o.sink.portletId)});let a=Math.max(...r);n=[];for(let o=0;o<=a;o++)n.push(o)}return{channelMapping:n}},build:e=>({inlets:A(e.channelMapping,(t,n)=>[`${n}`,{type:"signal",id:`${n}`}]),outlets:{},isPullingSignal:!0})},Ga={flags:{alphaName:"dac_t"},dsp:({ins:e,node:t},{core:n},{audio:r,target:a})=>g([t.args.channelMapping.map((o,i)=>[o,i]).filter(([o])=>0<=o&&o<r.channelCount.out).map(([o,i])=>a==="javascript"?`${n.OUTPUT}[${o}][${n.IT_FRAME}] = ${e[`${i}`]}`:`${n.OUTPUT}[${n.IT_FRAME} + ${n.BLOCK_SIZE} * ${o}] = ${e[`${i}`]}`)])};var ja={translateArgs:(e,t)=>{let n;if(e.args.length)n=e.args.map(r=>G(r)-1);else{let r=new Set;t.connections.forEach(o=>{o.source.nodeId===e.id&&r.add(o.source.portletId)});let a=Math.max(...r);n=[];for(let o=0;o<=a;o++)n.push(o)}return{channelMapping:n}},build:e=>({inlets:{},outlets:A(e.channelMapping,(t,n)=>[`${n}`,{type:"signal",id:`${n}`}])})},Ka={flags:{alphaName:"adc_t"},dsp:({outs:e,node:t},{core:n},{audio:r,target:a})=>g([t.args.channelMapping.map((o,i)=>[o,i]).filter(([o])=>0<=o&&o<r.channelCount.in).map(([o,i])=>a==="javascript"?`${e[`${i}`]} = ${n.INPUT}[${o}][${n.IT_FRAME}]`:`${e[`${i}`]} = ${n.INPUT}[${n.IT_FRAME} + ${n.BLOCK_SIZE} * ${o}]`)])};var xd="msg",X={namespace:xd,code:({ns:e},t,{target:n})=>{let r={create:u(e.create,[s(e.Template,"template")],e.Message),writeStringToken:u(e.writeStringToken,[s(e.Message,"message"),s("Int","tokenIndex"),s("string","value")],"void"),writeFloatToken:u(e.writeFloatToken,[s(e.Message,"message"),s("Int","tokenIndex"),s(e._FloatToken,"value")],"void"),readStringToken:u(e.readStringToken,[s(e.Message,"message"),s("Int","tokenIndex")],"string"),readFloatToken:u(e.readFloatToken,[s(e.Message,"message"),s("Int","tokenIndex")],e._FloatToken),getLength:u(e.getLength,[s(e.Message,"message")],"Int"),getTokenType:u(e.getTokenType,[s(e.Message,"message"),s("Int","tokenIndex")],"Int"),isStringToken:u(e.isStringToken,[s(e.Message,"message"),s("Int","tokenIndex")],"boolean"),isFloatToken:u(e.isFloatToken,[s(e.Message,"message"),s("Int","tokenIndex")],"boolean"),isMatching:u(e.isMatching,[s(e.Message,"message"),s(`Array<${e._HeaderEntry}>`,"tokenTypes")],"boolean"),floats:u(e.floats,[s("Array<Float>","values")],e.Message),strings:u(e.strings,[s("Array<string>","values")],e.Message),display:u(e.display,[s(e.Message,"message")],"string")},a=[u(e.VOID_MESSAGE_RECEIVER,[s(e.Message,"m")],"void")``,s(e.Message,e.EMPTY_MESSAGE,`${e.create}([])`)];if(e.Template,e.Handler,n==="assemblyscript")return g([`
                type ${e.Template} = Array<Int>
                
                type ${e._FloatToken} = Float
                type ${e._CharToken} = Int

                type ${e._HeaderEntry} = Int

                type ${e.Handler} = (m: ${e.Message}) => void
                `,h(e._HeaderEntry,e.FLOAT_TOKEN,"0"),h(e._HeaderEntry,e.STRING_TOKEN,"1"),r.create`
                    let i: Int = 0
                    let byteCount: Int = 0
                    let tokenTypes: Array<${e._HeaderEntry}> = []
                    let tokenPositions: Array<${e._HeaderEntry}> = []

                    i = 0
                    while (i < template.length) {
                        switch(template[i]) {
                            case ${e.FLOAT_TOKEN}:
                                byteCount += sizeof<${e._FloatToken}>()
                                tokenTypes.push(${e.FLOAT_TOKEN})
                                tokenPositions.push(byteCount)
                                i += 1
                                break
                            case ${e.STRING_TOKEN}:
                                byteCount += sizeof<${e._CharToken}>() * template[i + 1]
                                tokenTypes.push(${e.STRING_TOKEN})
                                tokenPositions.push(byteCount)
                                i += 2
                                break
                            default:
                                throw new Error("unknown token type : " + template[i].toString())
                        }
                    }

                    const tokenCount = tokenTypes.length
                    const headerByteCount = ${e._computeHeaderLength}(tokenCount) 
                        * sizeof<${e._HeaderEntry}>()
                    byteCount += headerByteCount

                    const buffer = new ArrayBuffer(byteCount)
                    const dataView = new DataView(buffer)
                    let writePosition: Int = 0
                    
                    dataView.setInt32(writePosition, tokenCount)
                    writePosition += sizeof<${e._HeaderEntry}>()

                    for (i = 0; i < tokenCount; i++) {
                        dataView.setInt32(writePosition, tokenTypes[i])
                        writePosition += sizeof<${e._HeaderEntry}>()
                    }

                    dataView.setInt32(writePosition, headerByteCount)
                    writePosition += sizeof<${e._HeaderEntry}>()
                    for (i = 0; i < tokenCount; i++) {
                        dataView.setInt32(writePosition, headerByteCount + tokenPositions[i])
                        writePosition += sizeof<${e._HeaderEntry}>()
                    }

                    const header = ${e._unpackHeader}(dataView, tokenCount)
                    return {
                        dataView,
                        tokenCount,
                        header,
                        tokenTypes: ${e._unpackTokenTypes}(header),
                        tokenPositions: ${e._unpackTokenPositions}(header),
                    }
                `,r.writeStringToken`
                    const startPosition = message.tokenPositions[tokenIndex]
                    const endPosition = message.tokenPositions[tokenIndex + 1]
                    const expectedStringLength: Int = (endPosition - startPosition) / sizeof<${e._CharToken}>()
                    if (value.length !== expectedStringLength) {
                        throw new Error('Invalid string size, specified ' + expectedStringLength.toString() + ', received ' + value.length.toString())
                    }

                    for (let i = 0; i < value.length; i++) {
                        message.dataView.setInt32(
                            startPosition + i * sizeof<${e._CharToken}>(), 
                            value.codePointAt(i)
                        )
                    }
                `,r.writeFloatToken`
                    setFloatDataView(message.dataView, message.tokenPositions[tokenIndex], value)
                `,r.readStringToken`
                    const startPosition = message.tokenPositions[tokenIndex]
                    const endPosition = message.tokenPositions[tokenIndex + 1]
                    const stringLength: Int = (endPosition - startPosition) / sizeof<${e._CharToken}>()
                    let value: string = ''
                    for (let i = 0; i < stringLength; i++) {
                        value += String.fromCodePoint(message.dataView.getInt32(startPosition + sizeof<${e._CharToken}>() * i))
                    }
                    return value
                `,r.readFloatToken`
                    return getFloatDataView(message.dataView, message.tokenPositions[tokenIndex])
                `,r.getLength`
                    return message.tokenTypes.length
                `,r.getTokenType`
                    return message.tokenTypes[tokenIndex]
                `,r.isStringToken`
                    return ${e.getTokenType}(message, tokenIndex) === ${e.STRING_TOKEN}
                `,r.isFloatToken`
                    return ${e.getTokenType}(message, tokenIndex) === ${e.FLOAT_TOKEN}
                `,r.isMatching`
                    if (message.tokenTypes.length !== tokenTypes.length) {
                        return false
                    }
                    for (let i: Int = 0; i < tokenTypes.length; i++) {
                        if (message.tokenTypes[i] !== tokenTypes[i]) {
                            return false
                        }
                    }
                    return true
                `,r.floats`
                    const message: ${e.Message} = ${e.create}(
                        values.map<${e._HeaderEntry}>(v => ${e.FLOAT_TOKEN}))
                    for (let i: Int = 0; i < values.length; i++) {
                        ${e.writeFloatToken}(message, i, values[i])
                    }
                    return message
                `,r.strings`
                    const template: ${e.Template} = []
                    for (let i: Int = 0; i < values.length; i++) {
                        template.push(${e.STRING_TOKEN})
                        template.push(values[i].length)
                    }
                    const message: ${e.Message} = ${e.create}(template)
                    for (let i: Int = 0; i < values.length; i++) {
                        ${e.writeStringToken}(message, i, values[i])
                    }
                    return message
                `,r.display`
                    let displayArray: Array<string> = []
                    for (let i: Int = 0; i < ${e.getLength}(message); i++) {
                        if (${e.isFloatToken}(message, i)) {
                            displayArray.push(${e.readFloatToken}(message, i).toString())
                        } else {
                            displayArray.push('"' + ${e.readStringToken}(message, i) + '"')
                        }
                    }
                    return '[' + displayArray.join(', ') + ']'
                `,y(e.Message,[s("DataView","dataView"),s(e._Header,"header"),s(e._HeaderEntry,"tokenCount"),s(e._Header,"tokenTypes"),s(e._Header,"tokenPositions")]),u(e.x_create,[s("Int32Array","templateTypedArray")],e.Message)`
                    const template: ${e.Template} = new Array<Int>(templateTypedArray.length)
                    for (let i: Int = 0; i < templateTypedArray.length; i++) {
                        template[i] = templateTypedArray[i]
                    }
                    return ${e.create}(template)
                `,u(e.x_getTokenTypes,[s(e.Message,"message")],e._Header)`
                    return message.tokenTypes
                `,u(e.x_createTemplate,[s("i32","length")],"Int32Array")`
                    return new Int32Array(length)
                `,`type ${e._Header} = Int32Array`,u(e._computeHeaderLength,[s("Int","tokenCount")],"Int")`
                    return 1 + tokenCount * 2 + 1
                `,u(e._unpackHeader,[s("DataView","messageDataView"),s(e._HeaderEntry,"tokenCount")],e._Header)`
                    const headerLength = ${e._computeHeaderLength}(tokenCount)
                    // TODO : why is this \`wrap\` not working ?
                    // return Int32Array.wrap(messageDataView.buffer, 0, headerLength)
                    const messageHeader = new Int32Array(headerLength)
                    for (let i = 0; i < headerLength; i++) {
                        messageHeader[i] = messageDataView.getInt32(sizeof<${e._HeaderEntry}>() * i)
                    }
                    return messageHeader
                `,u(e._unpackTokenTypes,[s(e._Header,"header")],e._Header)`
                    return header.slice(1, 1 + header[0])
                `,u(e._unpackTokenPositions,[s(e._Header,"header")],e._Header)`
                    return header.slice(1 + header[0])
                `,...a]);if(n==="javascript")return g([h("string",e.FLOAT_TOKEN,'"number"'),h("string",e.STRING_TOKEN,'"string"'),r.create`
                    const m = []
                    let i = 0
                    while (i < template.length) {
                        if (template[i] === ${e.STRING_TOKEN}) {
                            m.push('')
                            i += 2
                        } else if (template[i] === ${e.FLOAT_TOKEN}) {
                            m.push(0)
                            i += 1
                        }
                    }
                    return m
                `,r.getLength`
                    return message.length
                `,r.getTokenType`
                    return typeof message[tokenIndex]
                `,r.isStringToken`
                    return ${e.getTokenType}(message, tokenIndex) === 'string'
                `,r.isFloatToken`
                    return ${e.getTokenType}(message, tokenIndex) === 'number'
                `,r.isMatching`
                    return (message.length === tokenTypes.length) 
                        && message.every((v, i) => ${e.getTokenType}(message, i) === tokenTypes[i])
                `,r.writeFloatToken`
                    message[tokenIndex] = value
                `,r.writeStringToken`
                    message[tokenIndex] = value
                `,r.readFloatToken`
                    return message[tokenIndex]
                `,r.readStringToken`
                    return message[tokenIndex]
                `,r.floats`
                    return values
                `,r.strings`
                    return values
                `,r.display`
                    return '[' + message
                        .map(t => typeof t === 'string' ? '"' + t + '"' : t.toString())
                        .join(', ') + ']'
                `,...a]);throw new Error(`Unexpected target: ${n}`)},exports:({ns:e},t,{target:n})=>n==="assemblyscript"?[e.x_create,e.x_getTokenTypes,e.x_createTemplate,e.writeStringToken,e.writeFloatToken,e.readStringToken,e.readFloatToken,e.FLOAT_TOKEN,e.STRING_TOKEN]:[]};var T={namespace:"bangUtils",code:({ns:e},{msg:t})=>g([u(e.isBang,[s(t.Message,"message")],"boolean")`
            return (
                ${t.isStringToken}(message, 0) 
                && ${t.readStringToken}(message, 0) === 'bang'
            )
        `,u(e.bang,[],t.Message)`
            ${h(t.Message,"message",`${t.create}([${t.STRING_TOKEN}, 4])`)}
            ${t.writeStringToken}(message, 0, 'bang')
            return message
        `,u(e.emptyToBang,[s(t.Message,"message")],t.Message)`
            if (${t.getLength}(message) === 0) {
                return ${e.bang}()
            } else {
                return message
            }
        `]),dependencies:[X]},ze={namespace:"msgUtils",code:({ns:e},{msg:t})=>g([u(e.slice,[s(t.Message,"message"),s("Int","start"),s("Int","end")],t.Message)`
            if (${t.getLength}(message) <= start) {
                throw new Error('message empty')
            }
            ${h(t.Template,"template",`${e._copyTemplate}(message, start, end)`)}
            ${h(t.Message,"newMessage",`${t.create}(template)`)}
            ${e.copy}(message, newMessage, start, end, 0)
            return newMessage
        `,u(e.concat,[s(t.Message,"message1"),s(t.Message,"message2")],t.Message)`
            ${h(t.Message,"newMessage",`${t.create}(${e._copyTemplate}(message1, 0, ${t.getLength}(message1)).concat(${e._copyTemplate}(message2, 0, ${t.getLength}(message2))))`)}
            ${e.copy}(message1, newMessage, 0, ${t.getLength}(message1), 0)
            ${e.copy}(message2, newMessage, 0, ${t.getLength}(message2), ${t.getLength}(message1))
            return newMessage
        `,u(e.shift,[s(t.Message,"message")],t.Message)`
            switch (${t.getLength}(message)) {
                case 0:
                    throw new Error('message empty')
                case 1:
                    return ${t.create}([])
                default:
                    return ${e.slice}(message, 1, ${t.getLength}(message))
            }
        `,u(e.copy,[s(t.Message,"src"),s(t.Message,"dest"),s("Int","srcStart"),s("Int","srcEnd"),s("Int","destStart")],"void")`
            ${s("Int","i","srcStart")}
            ${s("Int","j","destStart")}
            for (i, j; i < srcEnd; i++, j++) {
                if (${t.getTokenType}(src, i) === ${t.STRING_TOKEN}) {
                    ${t.writeStringToken}(dest, j, ${t.readStringToken}(src, i))
                } else {
                    ${t.writeFloatToken}(dest, j, ${t.readFloatToken}(src, i))
                }
            }
        `,u(e._copyTemplate,[s(t.Message,"src"),s("Int","start"),s("Int","end")],t.Template)`
            ${h(t.Template,"template","[]")}
            for (${s("Int","i","start")}; i < end; i++) {
                ${h("Int","tokenType",`${t.getTokenType}(src, i)`)}
                template.push(tokenType)
                if (tokenType === ${t.STRING_TOKEN}) {
                    template.push(${t.readStringToken}(src, i).length)
                }
            }
            return template
        `]),dependencies:[X]},O={namespace:"actionUtils",code:({ns:e},{msg:t})=>g([u(e.isAction,[s(t.Message,"message"),s("string","action")],"boolean")`
            return ${t.isMatching}(message, [${t.STRING_TOKEN}])
                && ${t.readStringToken}(message, 0) === action
        `]),dependencies:[X]};var qa={translateArgs:()=>({}),build:()=>({inlets:{0:{type:"message",id:"0"}},outlets:{0:{type:"message",id:"0"}}})},Ha={flags:{alphaName:"samplerate_t"},messageReceivers:({snds:e},{core:t,msg:n,bangUtils:r})=>({0:f([s(n.Message,"m")])`
            if (${r.isBang}(m)) { 
                ${e.$0}(${n.floats}([${t.SAMPLE_RATE}])) 
                return
            }
        `}),dependencies:[T]};var Ya={translateArgs:e=>({frequency:I(e.args[0])||0}),build:()=>({inlets:{0:{type:"signal",id:"0"},1:{type:"message",id:"1"}},outlets:{0:{type:"signal",id:"0"}}}),configureMessageToSignalConnection:(e,{frequency:t})=>{if(e==="0")return{initialSignalValue:t}}},Xa=({alphaName:e,coeff:t,generateOperation:n})=>({flags:{alphaName:e},state:({ns:a})=>y(a.State,[s("Float","phase",0),s("Float","step",0)]),initialization:({ns:a,state:o})=>c`
            ${a.setStep}(${o}, 0)
        `,messageReceivers:({ns:a,state:o},{msg:i})=>({1:F(a.setPhase,o,i)}),dsp:({ns:a,state:o,outs:i,ins:l})=>({inlets:{0:c`${a.setStep}(${o}, ${l.$0})`},loop:c`
                ${i.$0} = ${n(`${o}.phase`)}
                ${o}.phase += ${o}.step
            `}),core:({ns:a},{core:o})=>g([u(a.setStep,[s(a.State,"state"),s("Float","freq")])`
                    state.step = (${t} / ${o.SAMPLE_RATE}) * freq
                `,u(a.setPhase,[s(a.State,"state"),s("Float","phase")])`
                    state.phase = phase % 1.0${t?` * ${t}`:""}
                `])}),Ja={"osc~":Xa({alphaName:"osc_t",coeff:"2 * Math.PI",generateOperation:e=>`Math.cos(${e})`}),"phasor~":Xa({alphaName:"phasor_t",coeff:"1",generateOperation:e=>`${e} % 1`})},Qa={"osc~":Ya,"phasor~":Ya};var Za={translateArgs:({args:e})=>({minValue:I(e[0])||0,maxValue:I(e[1])||0}),build:()=>({inlets:{0:{type:"signal",id:"0"},1:{type:"message",id:"1"},2:{type:"message",id:"2"}},outlets:{0:{type:"signal",id:"0"}}})},eo={flags:{isPureFunction:!0,isDspInline:!0,alphaName:"clip_t"},state:({node:{args:e},ns:t})=>y(t.State,[s("Float","minValue",e.minValue),s("Float","maxValue",e.maxValue)]),dsp:({ins:e,state:t})=>c`Math.max(Math.min(${t}.maxValue, ${e.$0}), ${t}.minValue)`,messageReceivers:({state:e},{msg:t})=>({1:se(`${e}.minValue`,t),2:se(`${e}.maxValue`,t)})};var to={translateArgs:()=>({}),build:()=>({inlets:{0:{type:"signal",id:"0"},"0_message":{type:"message",id:"0_message"},1:{type:"signal",id:"1"}},outlets:{0:{type:"signal",id:"0"}}}),configureMessageToSignalConnection:e=>{if(e==="0")return{reroutedMessageInletId:"0_message"}}},no={flags:{alphaName:"samphold_t"},state:({ns:e})=>y(e.State,[s("Float","signalMemory",0),s("Float","controlMemory",0)]),dsp:({ins:e,outs:t,state:n})=>c`
        ${n}.signalMemory = ${t.$0} = ${e.$1} < ${n}.controlMemory ? ${e.$0}: ${n}.signalMemory
        ${n}.controlMemory = ${e.$1}
    `,messageReceivers:({state:e},{msg:t})=>({"0_message":f([s(t.Message,"m")],"void")`
            if (
                ${t.isMatching}(m, [${t.STRING_TOKEN}, ${t.FLOAT_TOKEN}])
                && ${t.readStringToken}(m, 0) === 'set'
            ) {
                ${e}.signalMemory = ${t.readFloatToken}(m, 1)
                return
    
            } else if (
                ${t.isMatching}(m, [${t.STRING_TOKEN}, ${t.FLOAT_TOKEN}])
                && ${t.readStringToken}(m, 0) === 'reset'
            ) {
                ${e}.controlMemory = ${t.readFloatToken}(m, 1)
                return
    
            } else if (
                ${t.isMatching}(m, [${t.STRING_TOKEN}])
                && ${t.readStringToken}(m, 0) === 'reset'
            ) {
                ${e}.controlMemory = 1e20
                return
            }
        `})};var ro={translateArgs:()=>({}),build:()=>({inlets:{0:{type:"signal",id:"0"},"0_message":{type:"message",id:"0_message"}},outlets:{0:{type:"message",id:"0"}},isPullingSignal:!0}),configureMessageToSignalConnection:e=>{if(e==="0")return{reroutedMessageInletId:"0_message"}}},ao={flags:{alphaName:"snapshot_t"},state:({ns:e})=>y(e.State,[s("Float","currentValue",0)]),dsp:({ins:e,state:t})=>c`
        ${t}.currentValue = ${e.$0}
    `,messageReceivers:({state:e,snds:t},{msg:n,bangUtils:r})=>({"0_message":f([s(n.Message,"m")],"void")`
            if (${r.isBang}(m)) {
                ${t.$0}(${n.floats}([${e}.currentValue]))
                return 
            }
        `}),dependencies:[T]};var _d={namespace:"points",code:({ns:e})=>y(e.Point,[s("Float","x"),s("Float","y")])},oo={namespace:"points",code:({ns:e})=>u(e.interpolateLin,[s("Float","x"),s(e.Point,"p0"),s(e.Point,"p1")],"Float")`
        return p0.y + (x - p0.x) * (p1.y - p0.y) / (p1.x - p0.x)
    `,dependencies:[_d]};var Ge={namespace:"linesUtils",code:({ns:e},{points:t})=>g([y(e.LineSegment,[s(t.Point,"p0"),s(t.Point,"p1"),s("Float","dx"),s("Float","dy")]),u(e.computeSlope,[s(t.Point,"p0"),s(t.Point,"p1")],"Float")`
            return p1.x !== p0.x ? (p1.y - p0.y) / (p1.x - p0.x) : 0
        `,u(e.removePointsBeforeFrame,[s(`Array<${t.Point}>`,"points"),s("Float","frame")],`Array<${t.Point}>`)`
            ${h(`Array<${t.Point}>`,"newPoints","[]")}
            ${s("Int","i","0")}
            while (i < points.length) {
                if (frame <= points[i].x) {
                    newPoints.push(points[i])
                }
                i++
            }
            return newPoints
        `,u(e.insertNewLinePoints,[s(`Array<${t.Point}>`,"points"),s(t.Point,"p0"),s(t.Point,"p1")],`Array<${t.Point}>`)`
            ${h(`Array<${t.Point}>`,"newPoints","[]")}
            ${s("Int","i","0")}
            
            // Keep the points that are before the new points added
            while (i < points.length && points[i].x <= p0.x) {
                newPoints.push(points[i])
                i++
            }
            
            // Find the start value of the start point :
            
            // 1. If there is a previous point and that previous point
            // is on the same frame, we don't modify the start point value.
            // (represents a vertical line).
            if (0 < i - 1 && points[i - 1].x === p0.x) {

            // 2. If new points are inserted in between already existing points 
            // we need to interpolate the existing line to find the startValue.
            } else if (0 < i && i < points.length) {
                newPoints.push({
                    x: p0.x,
                    y: ${t.interpolateLin}(p0.x, points[i - 1], points[i])
                })

            // 3. If new line is inserted after all existing points, 
            // we just take the value of the last point
            } else if (i >= points.length && points.length) {
                newPoints.push({
                    x: p0.x,
                    y: points[points.length - 1].y,
                })

            // 4. If new line placed in first position, we take the defaultStartValue.
            } else if (i === 0) {
                newPoints.push({
                    x: p0.x,
                    y: p0.y,
                })
            }
            
            newPoints.push({
                x: p1.x,
                y: p1.y,
            })
            return newPoints
        `,u(e.computeFrameAjustedPoints,[s(`Array<${t.Point}>`,"points")],`Array<${t.Point}>`)`
            if (points.length < 2) {
                throw new Error('invalid length for points')
            }

            ${h(`Array<${t.Point}>`,"newPoints","[]")}
            ${s("Int","i","0")}
            ${s(t.Point,"p","points[0]")}
            ${s("Float","frameLower","0")}
            ${s("Float","frameUpper","0")}
            
            while(i < points.length) {
                p = points[i]
                frameLower = Math.floor(p.x)
                frameUpper = frameLower + 1

                // I. Placing interpolated point at the lower bound of the current frame
                // ------------------------------------------------------------------------
                // 1. Point is already on an exact frame,
                if (p.x === frameLower) {
                    newPoints.push({ x: p.x, y: p.y })

                    // 1.a. if several of the next points are also on the same X,
                    // we find the last one to draw a vertical line.
                    while (
                        (i + 1) < points.length
                        && points[i + 1].x === frameLower
                    ) {
                        i++
                    }
                    if (points[i].y !== newPoints[newPoints.length - 1].y) {
                        newPoints.push({ x: points[i].x, y: points[i].y })
                    }

                    // 1.b. if last point, we quit
                    if (i + 1 >= points.length) {
                        break
                    }

                    // 1.c. if next point is in a different frame we can move on to next iteration
                    if (frameUpper <= points[i + 1].x) {
                        i++
                        continue
                    }
                
                // 2. Point isn't on an exact frame
                // 2.a. There's a previous point, the we use it to interpolate the value.
                } else if (newPoints.length) {
                    newPoints.push({
                        x: frameLower,
                        y: ${t.interpolateLin}(frameLower, points[i - 1], p),
                    })
                
                // 2.b. It's the very first point, then we don't change its value.
                } else {
                    newPoints.push({ x: frameLower, y: p.y })
                }

                // II. Placing interpolated point at the upper bound of the current frame
                // ---------------------------------------------------------------------------
                // First, we find the closest point from the frame upper bound (could be the same p).
                // Or could be a point that is exactly placed on frameUpper.
                while (
                    (i + 1) < points.length 
                    && (
                        Math.ceil(points[i + 1].x) === frameUpper
                        || Math.floor(points[i + 1].x) === frameUpper
                    )
                ) {
                    i++
                }
                p = points[i]

                // 1. If the next point is directly in the next frame, 
                // we do nothing, as this corresponds with next iteration frameLower.
                if (Math.floor(p.x) === frameUpper) {
                    continue
                
                // 2. If there's still a point after p, we use it to interpolate the value
                } else if (i < points.length - 1) {
                    newPoints.push({
                        x: frameUpper,
                        y: ${t.interpolateLin}(frameUpper, p, points[i + 1]),
                    })

                // 3. If it's the last point, we dont change the value
                } else {
                    newPoints.push({ x: frameUpper, y: p.y })
                }

                i++
            }

            return newPoints
        `,u(e.computeLineSegments,[s(`Array<${t.Point}>`,"points")],`Array<${e.LineSegment}>`)`
            ${h(`Array<${e.LineSegment}>`,"lineSegments","[]")}
            ${s("Int","i","0")}
            ${s(t.Point,"p0")}
            ${s(t.Point,"p1")}

            while(i < points.length - 1) {
                p0 = points[i]
                p1 = points[i + 1]
                lineSegments.push({
                    p0, p1, 
                    dy: ${e.computeSlope}(p0, p1),
                    dx: 1,
                })
                i++
            }
            return lineSegments
        `]),dependencies:[oo]};var B={namespace:"timing",code:()=>u("computeUnitInSamples",[s("Float","sampleRate"),s("Float","amount"),s("string","unit")],"Float")`
        if (unit.slice(0, 3) === 'per') {
            if (amount !== 0) {
                amount = 1 / amount
            }
            unit = unit.slice(3)
        }

        if (unit === 'msec' || unit === 'milliseconds' || unit === 'millisecond') {
            return amount / 1000 * sampleRate
        } else if (unit === 'sec' || unit === 'seconds' || unit === 'second') {
            return amount * sampleRate
        } else if (unit === 'min' || unit === 'minutes' || unit === 'minute') {
            return amount * 60 * sampleRate
        } else if (unit === 'samp' || unit === 'samples' || unit === 'sample') {
            return amount
        } else {
            throw new Error("invalid time unit : " + unit)
        }
    `};var so={translateArgs:()=>({}),build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"},2:{type:"message",id:"2"}},outlets:{0:{type:"signal",id:"0"}}})},io={flags:{alphaName:"vline_t"},state:({ns:e},{linesUtils:t,points:n})=>y(e.State,[s(`Array<${n.Point}>`,"points","[]"),s(`Array<${t.LineSegment}>`,"lineSegments","[]"),s("Float","currentValue",0),s("Float","nextDurationSamp",0),s("Float","nextDelaySamp",0)]),dsp:({outs:e,state:t},{core:n})=>c`
        if (${t}.lineSegments.length) {
            if (toFloat(${n.FRAME}) < ${t}.lineSegments[0].p0.x) {

            // This should come first to handle vertical lines
            } else if (toFloat(${n.FRAME}) === ${t}.lineSegments[0].p1.x) {
                ${t}.currentValue = ${t}.lineSegments[0].p1.y
                ${t}.lineSegments.shift()

            } else if (toFloat(${n.FRAME}) === ${t}.lineSegments[0].p0.x) {
                ${t}.currentValue = ${t}.lineSegments[0].p0.y

            } else if (toFloat(${n.FRAME}) < ${t}.lineSegments[0].p1.x) {
                ${t}.currentValue += ${t}.lineSegments[0].dy

            }
        }
        ${e.$0} = ${t}.currentValue
    `,messageReceivers:({ns:e,state:t},{actionUtils:n,msg:r})=>({0:f([s(r.Message,"m")])`
        if (
            ${r.isMatching}(m, [${r.FLOAT_TOKEN}])
            || ${r.isMatching}(m, [${r.FLOAT_TOKEN}, ${r.FLOAT_TOKEN}])
            || ${r.isMatching}(m, [${r.FLOAT_TOKEN}, ${r.FLOAT_TOKEN}, ${r.FLOAT_TOKEN}])
        ) {
            switch (${r.getLength}(m)) {
                case 3:
                    ${e.setNextDelay}(${t}, ${r.readFloatToken}(m, 2))
                case 2:
                    ${e.setNextDuration}(${t}, ${r.readFloatToken}(m, 1))
                case 1:
                    ${e.setNewLine}(${t}, ${r.readFloatToken}(m, 0))
            }
            return
    
        } else if (${n.isAction}(m, 'stop')) {
            ${t}.points = []
            ${t}.lineSegments = []
            return
        }
        `,1:F(e.setNextDuration,t,r),2:F(e.setNextDelay,t,r)}),core:({ns:e},{linesUtils:t,core:n})=>g([u(e.setNewLine,[s(e.State,"state"),s("Float","targetValue")],"void")`
                state.points = ${t.removePointsBeforeFrame}(state.points, toFloat(${n.FRAME}))
                ${h("Float","startFrame",`toFloat(${n.FRAME}) + state.nextDelaySamp`)}
                ${h("Float","endFrame","startFrame + state.nextDurationSamp")}
                if (endFrame === toFloat(${n.FRAME})) {
                    state.currentValue = targetValue
                    state.lineSegments = []
                } else {
                    state.points = ${t.insertNewLinePoints}(
                        state.points, 
                        {x: startFrame, y: state.currentValue},
                        {x: endFrame, y: targetValue}
                    )
                    state.lineSegments = ${t.computeLineSegments}(
                        ${t.computeFrameAjustedPoints}(state.points))
                }
                state.nextDurationSamp = 0
                state.nextDelaySamp = 0
            `,u(e.setNextDuration,[s(e.State,"state"),s("Float","durationMsec")],"void")`
                state.nextDurationSamp = computeUnitInSamples(${n.SAMPLE_RATE}, durationMsec, 'msec')
            `,u(e.setNextDelay,[s(e.State,"state"),s("Float","delayMsec")],"void")`
                state.nextDelaySamp = computeUnitInSamples(${n.SAMPLE_RATE}, delayMsec, 'msec')
            `]),dependencies:[Ge,B,O]};var lo={translateArgs:({args:e})=>({initValue:I(e[0])||0}),build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}},outlets:{0:{type:"signal",id:"0"}}})},uo={flags:{alphaName:"line_t"},state:({node:{args:e},ns:t},{linesUtils:n})=>y(t.State,[s(n.LineSegment,"currentLine",t.defaultLine),s("Float","currentValue",e.initValue),s("Float","nextDurationSamp",0)]),messageReceivers:({ns:e,state:t},{actionUtils:n,msg:r})=>({0:f([s(r.Message,"m")])`
            if (
                ${r.isMatching}(m, [${r.FLOAT_TOKEN}])
                || ${r.isMatching}(m, [${r.FLOAT_TOKEN}, ${r.FLOAT_TOKEN}])
            ) {
                switch (${r.getLength}(m)) {
                    case 2:
                        ${e.setNextDuration}(${t}, ${r.readFloatToken}(m, 1))
                    case 1:
                        ${e.setNewLine}(${t}, ${r.readFloatToken}(m, 0))
                }
                return
    
            } else if (${n.isAction}(m, 'stop')) {
                ${e.stop}(${t})
                return
    
            }
        `,1:F(e.setNextDuration,t,r)}),dsp:({outs:e,state:t},{core:n})=>c`
        ${e.$0} = ${t}.currentValue
        if (toFloat(${n.FRAME}) < ${t}.currentLine.p1.x) {
            ${t}.currentValue += ${t}.currentLine.dy
            if (toFloat(${n.FRAME} + 1) >= ${t}.currentLine.p1.x) {
                ${t}.currentValue = ${t}.currentLine.p1.y
            }
        }
    `,core:({ns:e},{linesUtils:t,core:n})=>g([h(t.LineSegment,e.defaultLine,`{
                p0: {x: -1, y: 0},
                p1: {x: -1, y: 0},
                dx: 1,
                dy: 0,
            }`),u(e.setNewLine,[s(e.State,"state"),s("Float","targetValue")],"void")`
                ${h("Float","startFrame",`toFloat(${n.FRAME})`)}
                ${h("Float","endFrame",`toFloat(${n.FRAME}) + state.nextDurationSamp`)}
                if (endFrame === toFloat(${n.FRAME})) {
                    state.currentLine = ${e.defaultLine}
                    state.currentValue = targetValue
                    state.nextDurationSamp = 0
                } else {
                    state.currentLine = {
                        p0: {
                            x: startFrame, 
                            y: state.currentValue,
                        }, 
                        p1: {
                            x: endFrame, 
                            y: targetValue,
                        }, 
                        dx: 1,
                        dy: 0,
                    }
                    state.currentLine.dy = ${t.computeSlope}(state.currentLine.p0, state.currentLine.p1)
                    state.nextDurationSamp = 0
                }
            `,u(e.setNextDuration,[s(e.State,"state"),s("Float","durationMsec")],"void")`
                state.nextDurationSamp = computeUnitInSamples(${n.SAMPLE_RATE}, durationMsec, 'msec')
            `,u(e.stop,[s(e.State,"state")],"void")`
                state.currentLine.p1.x = -1
                state.currentLine.p1.y = state.currentValue
            `]),dependencies:[O,B,Ge]};var Ad="sked",ut={namespace:Ad,code:({ns:e},t,{target:n})=>{let r=[];return n==="assemblyscript"&&r.push(`
                type ${e.Callback} = (event: ${e.Event}) => void
                type ${e.Id} = Int
                type ${e.Mode} = Int
                type ${e.Event} = string
            `),g([...r,h(e.Id,e.ID_NULL,"-1"),h(e.Id,e._ID_COUNTER_INIT,"1"),h("Int",e._MODE_WAIT,"0"),h("Int",e._MODE_SUBSCRIBE,"1"),y(e._Request,[s(e.Id,"id"),s(e.Mode,"mode"),s(e.Callback,"callback")]),y(e.Skeduler,[s(`Map<${e.Event}, Array<${e.Id}>>`,"events"),s(`Map<${e.Id}, ${e._Request}>`,"requests"),s("boolean","isLoggingEvents"),s(`Set<${e.Event}>`,"eventLog"),s(e.Id,"idCounter")]),u(e.create,[s("boolean","isLoggingEvents")],e.Skeduler)`
                return {
                    eventLog: new Set(),
                    events: new Map(),
                    requests: new Map(),
                    idCounter: ${e._ID_COUNTER_INIT},
                    isLoggingEvents,
                }
            `,u(e.wait,[s(e.Skeduler,"skeduler"),s(e.Event,"event"),s(e.Callback,"callback")],e.Id)`
                if (skeduler.isLoggingEvents === false) {
                    throw new Error("Please activate skeduler's isLoggingEvents")
                }

                if (skeduler.eventLog.has(event)) {
                    callback(event)
                    return ${e.ID_NULL}
                } else {
                    return ${e._createRequest}(skeduler, event, callback, ${e._MODE_WAIT})
                }
            `,u(e.waitFuture,[s(e.Skeduler,"skeduler"),s(e.Event,"event"),s(e.Callback,"callback")],e.Id)`
                return ${e._createRequest}(skeduler, event, callback, ${e._MODE_WAIT})
            `,u(e.subscribe,[s(e.Skeduler,"skeduler"),s(e.Event,"event"),s(e.Callback,"callback")],e.Id)`
                return ${e._createRequest}(skeduler, event, callback, ${e._MODE_SUBSCRIBE})
            `,u(e.emit,[s(e.Skeduler,"skeduler"),s(e.Event,"event")],"void")`
                if (skeduler.isLoggingEvents === true) {
                    skeduler.eventLog.add(event)
                }
                if (skeduler.events.has(event)) {
                    ${h(`Array<${e.Id}>`,"skedIds","skeduler.events.get(event)")}
                    ${h(`Array<${e.Id}>`,"skedIdsStaying","[]")}
                    for (${s("Int","i","0")}; i < skedIds.length; i++) {
                        if (skeduler.requests.has(skedIds[i])) {
                            ${h(e._Request,"request","skeduler.requests.get(skedIds[i])")}
                            request.callback(event)
                            if (request.mode === ${e._MODE_WAIT}) {
                                skeduler.requests.delete(request.id)
                            } else {
                                skedIdsStaying.push(request.id)
                            }
                        }
                    }
                    skeduler.events.set(event, skedIdsStaying)
                }
            `,u(e.cancel,[s(e.Skeduler,"skeduler"),s(e.Id,"id")],"void")`
                skeduler.requests.delete(id)
            `,u(e._createRequest,[s(e.Skeduler,"skeduler"),s(e.Event,"event"),s(e.Callback,"callback"),s(e.Mode,"mode")],e.Id)`
                ${h(e.Id,"id",`${e._nextId}(skeduler)`)}
                ${h(e._Request,"request",`{
                    id, 
                    mode, 
                    callback,
                }`)}
                skeduler.requests.set(id, request)
                if (!skeduler.events.has(event)) {
                    skeduler.events.set(event, [id])    
                } else {
                    skeduler.events.get(event).push(id)
                }
                return id
            `,u(e._nextId,[s(e.Skeduler,"skeduler")],e.Id)`
                return skeduler.idCounter++
            `])}};var po="commons",W={namespace:po,code:({ns:e},{sked:t},n)=>g([h("Map<string, FloatArray>",e._ARRAYS,"new Map()"),h(t.Skeduler,e._ARRAYS_SKEDULER,`${t.create}(false)`),u(e.getArray,[s("string","arrayName")],"FloatArray")`
            if (!${e._ARRAYS}.has(arrayName)) {
                throw new Error('Unknown array ' + arrayName)
            }
            return ${e._ARRAYS}.get(arrayName)
        `,u(e.hasArray,[s("string","arrayName")],"boolean")`
            return ${e._ARRAYS}.has(arrayName)
        `,u(e.setArray,[s("string","arrayName"),s("FloatArray","array")],"void")`
            ${e._ARRAYS}.set(arrayName, array)
            ${t.emit}(${e._ARRAYS_SKEDULER}, arrayName)
        `,u(e.subscribeArrayChanges,[s("string","arrayName"),s(t.Callback,"callback")],t.Id)`
            const id = ${t.subscribe}(${e._ARRAYS_SKEDULER}, arrayName, callback)
            if (${e._ARRAYS}.has(arrayName)) {
                callback(arrayName)
            }
            return id
        `,u(e.cancelArrayChangesSubscription,[s(t.Id,"id")],"void")`
            ${t.cancel}(${e._ARRAYS_SKEDULER}, id)
        `,Object.entries(n.arrays).map(([r,a])=>g([`${e.setArray}("${r}", createFloatArray(${a.length}))`,`${e.getArray}("${r}").set(${JSON.stringify(Array.from(a))})`]))]),exports:({ns:e})=>[e.getArray,e.setArray],dependencies:[ut]},V={namespace:po,code:({ns:e},{sked:t})=>g([h(t.Skeduler,e._FRAME_SKEDULER,`${t.create}(false)`),u(e._emitFrame,[s("Int","frame")],"void")`
            ${t.emit}(${e._FRAME_SKEDULER}, frame.toString())
        `,u(e.waitFrame,[s("Int","frame"),s(t.Callback,"callback")],t.Id)`
            return ${t.waitFuture}(${e._FRAME_SKEDULER}, frame.toString(), callback)
        `,u(e.cancelWaitFrame,[s(t.Id,"id")],"void")`
            ${t.cancel}(${e._FRAME_SKEDULER}, id)
        `]),dependencies:[ut]};var qn=20,co={translateArgs:({args:e})=>({initValue:I(e[0])||0,timeGrainMsec:Math.max(I(e[1])||qn,qn)}),build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"},2:{type:"message",id:"2"}},outlets:{0:{type:"message",id:"0"}},isPushingMessages:!0})},mo={state:({node:{args:e},ns:t},{sked:n,msg:r,linesUtils:a})=>y(t.State,[s(a.LineSegment,"currentLine",`{
                p0: {x: -1, y: 0},
                p1: {x: -1, y: 0},
                dx: 1,
                dy: 0,
            }`),s("Float","currentValue",e.initValue),s("Float","nextSamp",-1),s("Int","nextSampInt",-1),s("Float","grainSamp",0),s("Float","nextDurationSamp",0),s(n.Id,"skedId",n.ID_NULL),s(r.Handler,"snd0",c`${f([s(r.Message,"m")])``}`),s(n.Callback,"tickCallback",c`${f()``}`)]),initialization:({ns:e,node:{args:t},state:n,snds:r})=>c`
            ${e.setGrain}(${n}, ${t.timeGrainMsec})
            ${n}.snd0 = ${r.$0}
            ${n}.tickCallback = ${f()`
                ${e.tick}(${n})
            `}
        `,messageReceivers:({ns:e,snds:t,state:n},{actionUtils:r,msg:a})=>({0:f([s(a.Message,"m")])`
            if (
                ${a.isMatching}(m, [${a.FLOAT_TOKEN}])
                || ${a.isMatching}(m, [${a.FLOAT_TOKEN}, ${a.FLOAT_TOKEN}])
                || ${a.isMatching}(m, [${a.FLOAT_TOKEN}, ${a.FLOAT_TOKEN}, ${a.FLOAT_TOKEN}])
            ) {
                ${e.stopCurrentLine}(${n})
                switch (${a.getLength}(m)) {
                    case 3:
                        ${e.setGrain}(${n}, ${a.readFloatToken}(m, 2))
                    case 2:
                        ${e.setNextDuration}(${n}, ${a.readFloatToken}(m, 1))
                    case 1:
                        ${h("Float","targetValue",`${a.readFloatToken}(m, 0)`)}
                        if (${n}.nextDurationSamp === 0) {
                            ${n}.currentValue = targetValue
                            ${t.$0}(${a.floats}([targetValue]))
                        } else {
                            ${t.$0}(${a.floats}([${n}.currentValue]))
                            ${e.setNewLine}(${n}, targetValue)
                            ${e.incrementTime}(${n}, ${n}.currentLine.dx)
                            ${e.scheduleNextTick}(${n})
                        }
                        
                }
                return
    
            } else if (${r.isAction}(m, 'stop')) {
                ${e.stopCurrentLine}(${n})
                return
    
            } else if (
                ${a.isMatching}(m, [${a.STRING_TOKEN}, ${a.FLOAT_TOKEN}])
                && ${a.readStringToken}(m, 0) === 'set'
            ) {
                ${e.stopCurrentLine}(${n})
                ${n}.currentValue = ${a.readFloatToken}(m, 1)
                return
            }
        `,1:F(e.setNextDuration,n,a),2:F(e.setGrain,n,a)}),core:({ns:e},{commons:t,core:n,sked:r,msg:a,linesUtils:o,points:i})=>g([u(e.setNewLine,[s(e.State,"state"),s("Float","targetValue")],"void")`
                state.currentLine = {
                    p0: {
                        x: toFloat(${n.FRAME}), 
                        y: state.currentValue,
                    }, 
                    p1: {
                        x: toFloat(${n.FRAME}) + state.nextDurationSamp, 
                        y: targetValue,
                    }, 
                    dx: state.grainSamp
                }
                state.nextDurationSamp = 0
                state.currentLine.dy = ${o.computeSlope}(state.currentLine.p0, state.currentLine.p1) * state.grainSamp
            `,u(e.setNextDuration,[s(e.State,"state"),s("Float","durationMsec")],"void")`
                state.nextDurationSamp = computeUnitInSamples(${n.SAMPLE_RATE}, durationMsec, 'msec')
            `,u(e.setGrain,[s(e.State,"state"),s("Float","grainMsec")],"void")`
                state.grainSamp = computeUnitInSamples(${n.SAMPLE_RATE}, Math.max(grainMsec, ${qn}), 'msec')
            `,u(e.stopCurrentLine,[s(e.State,"state")],"void")`
                if (state.skedId !== ${r.ID_NULL}) {
                    ${t.cancelWaitFrame}(state.skedId)
                    state.skedId = ${r.ID_NULL}
                }
                if (${n.FRAME} < state.nextSampInt) {
                    ${e.incrementTime}(state, -1 * (state.nextSamp - toFloat(${n.FRAME})))
                }
                ${e.setNextSamp}(state, -1)
            `,u(e.setNextSamp,[s(e.State,"state"),s("Float","currentSamp")],"void")`
                state.nextSamp = currentSamp
                state.nextSampInt = toInt(Math.round(currentSamp))
            `,u(e.incrementTime,[s(e.State,"state"),s("Float","incrementSamp")],"void")`
                if (incrementSamp === state.currentLine.dx) {
                    state.currentValue += state.currentLine.dy
                } else {
                    state.currentValue += ${i.interpolateLin}(
                        incrementSamp,
                        {x: 0, y: 0},
                        {x: state.currentLine.dx, y: state.currentLine.dy},
                    )
                }
                ${e.setNextSamp}(
                    state, 
                    (state.nextSamp !== -1 ? state.nextSamp: toFloat(${n.FRAME})) + incrementSamp
                )
            `,u(e.tick,[s(e.State,"state")],"void")`
                state.snd0(${a.floats}([state.currentValue]))
                if (toFloat(${n.FRAME}) >= state.currentLine.p1.x) {
                    state.currentValue = state.currentLine.p1.y
                    ${e.stopCurrentLine}(state)
                } else {
                    ${e.incrementTime}(state, state.currentLine.dx)
                    ${e.scheduleNextTick}(state)
                }
            `,u(e.scheduleNextTick,[s(e.State,"state")],"void")`
                state.skedId = ${t.waitFrame}(state.nextSampInt, state.tickCallback)
            `]),dependencies:[O,B,Ge,V]};var Md=Math.pow(2,1430/12)*440,Gt={namespace:"funcs",code:({ns:e})=>u(e.mtof,[s("Float","value")],"Float")`
        return value <= -1500 ? 0: (value > 1499 ? ${Md} : Math.pow(2, (value - 69) / 12) * 440)
    `},jt={namespace:"funcs",code:({ns:e})=>u(e.ftom,[s("Float","value")],"Float")`
        return value <= 0 ? -1500: 12 * Math.log(value / 440) / Math.LN2 + 69
    `},Kt={namespace:"funcs",code:({ns:e})=>u(e.pow,[s("Float","leftOp"),s("Float","rightOp")],"Float")`
        return leftOp > 0 || (Math.round(rightOp) === rightOp) ? Math.pow(leftOp, rightOp): 0
    `},qt={namespace:"funcs",code:({ns:e})=>u(e.log,[s("Float","leftOp"),s("Float","rightOp")],"Float")`
        return Math.max(Math.log(leftOp) / Math.log(rightOp), -1000)
    `};var Oe={translateArgs:()=>({}),build:()=>({inlets:{0:{type:"signal",id:"0"}},outlets:{0:{type:"signal",id:"0"}}})},ho={"abs~":{flags:{isPureFunction:!0,isDspInline:!0,alphaName:"abs_t"},dsp:({ins:e})=>c`Math.abs(${e.$0})`},"cos~":{flags:{isPureFunction:!0,isDspInline:!0,alphaName:"cos_t"},dsp:({ins:e})=>c`Math.cos(${e.$0} * 2 * Math.PI)`},"wrap~":{flags:{isPureFunction:!0,isDspInline:!0,alphaName:"wrap_t"},dsp:({ins:e})=>c`(1 + (${e.$0} % 1)) % 1`},"sqrt~":{flags:{isPureFunction:!0,isDspInline:!0,alphaName:"sqrt_t"},dsp:({ins:e})=>c`${e.$0} >= 0 ? Math.pow(${e.$0}, 0.5): 0`},"exp~":{flags:{isPureFunction:!0,isDspInline:!0,alphaName:"exp_t"},dsp:({ins:e})=>c`Math.exp(${e.$0})`},"mtof~":{flags:{isPureFunction:!0,isDspInline:!0,alphaName:"mtof_t"},dsp:({ins:e},{funcs:t})=>c`${t.mtof}(${e.$0})`,dependencies:[Gt]},"ftom~":{flags:{isPureFunction:!0,isDspInline:!0,alphaName:"ftom_t"},dsp:({ins:e},{funcs:t})=>c`${t.ftom}(${e.$0})`,dependencies:[jt]}},fo={"abs~":Oe,"cos~":Oe,"wrap~":Oe,"sqrt~":Oe,"exp~":Oe,"mtof~":Oe,"ftom~":Oe};var Ht=e=>({arrayName:_(e.args[0])||""}),le=(e,{sked:t,commons:n})=>g([h("FloatArray",e.emptyArray,"createFloatArray(1)"),u(e.createState,[s("string","arrayName")],e.State)`
            return {
                array: ${e.emptyArray},
                arrayName,
                arrayChangesSubscription: ${t.ID_NULL},
                readPosition: 0,
                readUntil: 0,
                writePosition: 0,
            }
        `,u(e.setArrayName,[s(e.State,"state"),s("string","arrayName"),s(t.Callback,"callback")],"void")`
            if (state.arrayChangesSubscription != ${t.ID_NULL}) {
                ${n.cancelArrayChangesSubscription}(state.arrayChangesSubscription)
            }
            state.arrayName = arrayName
            state.array = ${e.emptyArray}
            ${n.subscribeArrayChanges}(arrayName, callback)
        `,u(e.prepareIndex,[s("Float","index"),s("Int","arrayLength")],"Int")`
            return toInt(Math.min(
                Math.max(
                    0, Math.floor(index)
                ), toFloat(arrayLength - 1)
            ))
        `]);var go={translateArgs:Ht,build:()=>({inlets:{0:{type:"message",id:"0"}},outlets:{0:{type:"message",id:"0"}}})},yo={state:({node:{args:e},ns:t},{sked:n})=>y(t.State,[s("FloatArray","array",t.emptyArray),s("string","arrayName",`"${e.arrayName}"`),s(n.Id,"arrayChangesSubscription",n.ID_NULL),s("Int","readPosition",0),s("Int","readUntil",0),s("Int","writePosition",0)]),initialization:({ns:e,state:t})=>c`
        if (${t}.arrayName.length) {
            ${e.setArrayName}(
                ${t}, 
                ${t}.arrayName,
                () => ${e.setArrayNameFinalize}(${t})
            )
        }
    `,messageReceivers:({ns:e,snds:t,state:n},{msg:r})=>({0:f([s(r.Message,"m")])`
            if (${r.isMatching}(m, [${r.FLOAT_TOKEN}])) {        
                if (${n}.array.length === 0) {
                    ${t.$0}(${r.floats}([0]))

                } else {
                    ${t.$0}(${r.floats}([${n}.array[
                        ${e.prepareIndex}(
                            ${r.readFloatToken}(m, 0), 
                            ${n}.array.length
                        )
                    ]]))
                }
                return 

            } else if (
                ${r.isMatching}(m, [${r.STRING_TOKEN}, ${r.STRING_TOKEN}])
                && ${r.readStringToken}(m, 0) === 'set'
            ) {
                ${e.setArrayName}(
                    ${n}, 
                    ${r.readStringToken}(m, 1),
                    () => ${e.setArrayNameFinalize}(${n})
                )
                return
        
            }
        `}),core:({ns:e},t)=>{let{commons:n}=t;return g([le(e,t),u(e.setArrayNameFinalize,[s(e.State,"state")],"void")`
                state.array = ${n.getArray}(state.arrayName)
            `])},dependencies:[W]};var $o={translateArgs:Ht,build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}},outlets:{}})},So={state:({node:{args:e},ns:t},{sked:n})=>y(t.State,[s("FloatArray","array",t.emptyArray),s("string","arrayName",`"${e.arrayName}"`),s(n.Id,"arrayChangesSubscription",n.ID_NULL),s("Int","readPosition",0),s("Int","readUntil",0),s("Int","writePosition",0)]),initialization:({ns:e,state:t})=>c`
        if (${t}.arrayName.length) {
            ${e.setArrayName}(
                ${t}, 
                ${t}.arrayName,
                () => ${e.setArrayNameFinalize}(${t})
            )
        }
    `,messageReceivers:({ns:e,state:t},{msg:n})=>({0:f([s(n.Message,"m")])`
            if (${n.isMatching}(m, [${n.FLOAT_TOKEN}])) {        
                if (${t}.array.length === 0) {
                    return

                } else {
                    ${t}.array[${t}.writePosition] = ${n.readFloatToken}(m, 0)
                    return
                }

            } else if (
                ${n.isMatching}(m, [${n.STRING_TOKEN}, ${n.STRING_TOKEN}])
                && ${n.readStringToken}(m, 0) === 'set'
            ) {
                ${e.setArrayName}(
                    ${t}, 
                    ${n.readStringToken}(m, 1),
                    () => ${e.setArrayNameFinalize}(${t}),
                )
                return
        
            }
        `,1:F(e.setWritePosition,t,n)}),core:({ns:e},t)=>{let{commons:n}=t;return g([le(e,t),u(e.setArrayNameFinalize,[s(e.State,"state")],"void")`
                state.array = ${n.getArray}(state.arrayName)
            `,u(e.setWritePosition,[s(e.State,"state"),s("Float","writePosition")],"void")`
                state.writePosition = ${e.prepareIndex}(writePosition, state.array.length)
            `])},dependencies:[W]};var Io={translateArgs:e=>({arrayName:_(e.args[0])||""}),build:()=>({isPullingSignal:!0,inlets:{0:{type:"signal",id:"0"},"0_message":{type:"message",id:"0_message"}},outlets:{}}),configureMessageToSignalConnection:e=>{if(e==="0")return{reroutedMessageInletId:"0_message"}}},bo={flags:{alphaName:"tabwrite_t"},state:({node:{args:e},ns:t},{sked:n})=>y(t.State,[s("FloatArray","array",t.emptyArray),s("string","arrayName",`"${e.arrayName}"`),s(n.Id,"arrayChangesSubscription",n.ID_NULL),s("Int","writePosition",0)]),initialization:({ns:e,state:t})=>c`
        if (${t}.arrayName.length) {
            ${e.setArrayName}(
                ${t}, 
                ${t}.arrayName,
                () => ${e.setArrayNameFinalize}(${t})
            )
        }
    `,messageReceivers:({ns:e,state:t},{msg:n,bangUtils:r,actionUtils:a})=>({"0_message":f([s(n.Message,"m")])`
            if (${r.isBang}(m)) {
                ${e.start}(${t}, 0)
                return 
                
            } else if (${a.isAction}(m, 'stop')) {
                ${e.stop}(${t})
                return 
    
            } else if (
                ${n.isMatching}(m, [${n.STRING_TOKEN}, ${n.STRING_TOKEN}])
                && ${n.readStringToken}(m, 0) === 'set'
            ) {
                ${e.setArrayName}(
                    ${t},
                    ${n.readStringToken}(m, 1),
                    () => ${e.setArrayNameFinalize}(${t}),
                )
                return
    
            } else if (
                ${n.isMatching}(m, [${n.STRING_TOKEN}, ${n.FLOAT_TOKEN}])
                && ${n.readStringToken}(m, 0) === 'start'
            ) {
                ${e.start}(
                    ${t},
                    toInt(${n.readFloatToken}(m, 1))
                )
                return 
    
            }
        `}),dsp:({state:e,ins:t})=>c`
        if (${e}.writePosition < ${e}.array.length) {
            ${e}.array[${e}.writePosition++] = ${t.$0}
        }
    `,core:({ns:e},t)=>{let{commons:n}=t;return g([le(e,t),u(e.setArrayNameFinalize,[s(e.State,"state")],"void")`
                state.array = ${n.getArray}(state.arrayName)
                state.writePosition = state.array.length
            `,u(e.start,[s(e.State,"state"),s("Int","writeFrom")],"void")`
                state.writePosition = writeFrom
            `,u(e.stop,[s(e.State,"state")],"void")`
                state.writePosition = state.array.length
            `])},dependencies:[W,O,T]};var wo={translateArgs:e=>({arrayName:_(e.args[0])||""}),build:()=>({inlets:{0:{type:"signal",id:"0"},"0_message":{type:"message",id:"0_message"}},outlets:{0:{type:"signal",id:"0"}}}),configureMessageToSignalConnection:e=>{if(e==="0")return{reroutedMessageInletId:"0_message"}}},To={flags:{isDspInline:!0,alphaName:"tabread_t"},state:({node:{args:e},ns:t},{sked:n})=>y(t.State,[s("FloatArray","array",t.emptyArray),s("string","arrayName",`"${e.arrayName}"`),s(n.Id,"arrayChangesSubscription",n.ID_NULL),s("Int","readPosition",0),s("Int","readUntil",0),s("Int","writePosition",0)]),initialization:({ns:e,state:t})=>c`
        if (${t}.arrayName.length) {
            ${e.setArrayName}(
                ${t}, 
                ${t}.arrayName,
                () => ${e.setArrayNameFinalize}(${t})
            )
        }
    `,messageReceivers:({ns:e,state:t},{msg:n})=>({"0_message":f([s(n.Message,"m")])`
            if (
                ${n.isMatching}(m, [${n.STRING_TOKEN}, ${n.STRING_TOKEN}])
                && ${n.readStringToken}(m, 0) === 'set'
            ) {
                ${e.setArrayName}(
                    ${t},
                    ${n.readStringToken}(m, 1),
                    () => ${e.setArrayNameFinalize}(${t}),
                )
                return
    
            }
        `}),dsp:({ins:e,state:t})=>c`${t}.array[toInt(Math.max(Math.min(Math.floor(${e.$0}), toFloat(${t}.array.length - 1)), 0))]`,core:({ns:e},t)=>{let{commons:n}=t;return g([le(e,t),u(e.setArrayNameFinalize,[s(e.State,"state")],"void")`
                state.array = ${n.getArray}(state.arrayName)
            `])},dependencies:[T,W,O]},xo={"tabread~":wo,"tabread4~":wo},_o={"tabread~":To,"tabread4~":To};var Ao={translateArgs:e=>({arrayName:_(e.args[0])||""}),build:()=>({inlets:{0:{type:"message",id:"0"}},outlets:{0:{type:"signal",id:"0"},1:{type:"message",id:"1"}}})},Mo={flags:{alphaName:"tabplay_t"},state:({node:{args:e},ns:t},{sked:n})=>y(t.State,[s("FloatArray","array",t.emptyArray),s("string","arrayName",`"${e.arrayName}"`),s(n.Id,"arrayChangesSubscription",n.ID_NULL),s("Int","readPosition",0),s("Int","readUntil",0),s("Int","writePosition",0)]),initialization:({ns:e,state:t})=>c`
        if (${t}.arrayName.length) {
            ${e.setArrayName}(
                ${t}, 
                ${t}.arrayName,
                () => ${e.setArrayNameFinalize}(${t})
            )
        }
    `,messageReceivers:({ns:e,state:t},{msg:n,bangUtils:r,actionUtils:a})=>({0:f([s(n.Message,"m")])`
            if (${r.isBang}(m)) {
                ${e.play}(${t}, 0, ${t}.array.length)
                return 
                
            } else if (${a.isAction}(m, 'stop')) {
                ${e.stop}(${t})
                return 
    
            } else if (
                ${n.isMatching}(m, [${n.STRING_TOKEN}, ${n.STRING_TOKEN}])
                && ${n.readStringToken}(m, 0) === 'set'
            ) {
                ${e.setArrayName}(
                    ${t},
                    ${n.readStringToken}(m, 1),
                    () => ${e.setArrayNameFinalize}(${t}),
                )
                return
    
            } else if (${n.isMatching}(m, [${n.FLOAT_TOKEN}])) {
                ${e.play}(
                    ${t},
                    toInt(${n.readFloatToken}(m, 0)), 
                    ${t}.array.length
                )
                return 
    
            } else if (${n.isMatching}(m, [${n.FLOAT_TOKEN}, ${n.FLOAT_TOKEN}])) {
                ${h("Int","fromSample",`toInt(${n.readFloatToken}(m, 0))`)}
                ${e.play}(
                    ${t},
                    fromSample,
                    fromSample + toInt(${n.readFloatToken}(m, 1)),
                )
                return
            }
        `}),dsp:({state:e,snds:t,outs:n},{bangUtils:r})=>c`
        if (${e}.readPosition < ${e}.readUntil) {
            ${n.$0} = ${e}.array[${e}.readPosition]
            ${e}.readPosition++
            if (${e}.readPosition >= ${e}.readUntil) {
                ${t.$1}(${r.bang}())
            }
        } else {
            ${n.$0} = 0
        }
    `,core:({ns:e},t)=>{let{commons:n}=t;return g([le(e,t),u(e.setArrayNameFinalize,[s(e.State,"state")],"void")`
                state.array = ${n.getArray}(state.arrayName)
                state.readPosition = state.array.length
                state.readUntil = state.array.length
            `,u(e.play,[s(e.State,"state"),s("Int","playFrom"),s("Int","playTo")],"void")`
                state.readPosition = playFrom
                state.readUntil = toInt(Math.min(
                    toFloat(playTo), 
                    toFloat(state.array.length),
                ))
            `,u(e.stop,[s(e.State,"state")],"void")`
                state.readPosition = 0
                state.readUntil = 0
            `])},dependencies:[T,W,O]};var Hn="buf",je={namespace:Hn,code:({ns:e})=>g([y(e.SoundBuffer,[s("FloatArray","data"),s("Int","length"),s("Int","writeCursor"),s("Int","pullAvailableLength")]),u(e.clear,[s(e.SoundBuffer,"buffer")],"void")`
            buffer.data.fill(0)
        `,u(e.create,[s("Int","length")],e.SoundBuffer)`
            return {
                data: createFloatArray(length),
                length: length,
                writeCursor: 0,
                pullAvailableLength: 0,
            }
        `])},ko={namespace:Hn,code:({ns:e})=>g([u(e.pushBlock,[s(e.SoundBuffer,"buffer"),s("FloatArray","block")],"Int")`
            if (buffer.pullAvailableLength + block.length > buffer.length) {
                throw new Error('buffer full')
            }

            ${s("Int","left","block.length")}
            while (left > 0) {
                ${h("Int","lengthToWrite",`toInt(Math.min(
                    toFloat(buffer.length - buffer.writeCursor), 
                    toFloat(left),
                ))`)}
                buffer.data.set(
                    block.subarray(
                        block.length - left, 
                        block.length - left + lengthToWrite
                    ), 
                    buffer.writeCursor
                )
                left -= lengthToWrite
                buffer.writeCursor = (buffer.writeCursor + lengthToWrite) % buffer.length
                buffer.pullAvailableLength += lengthToWrite
            }
            return buffer.pullAvailableLength
        `,u(e.pullSample,[s(e.SoundBuffer,"buffer")],"Float")`
            if (buffer.pullAvailableLength <= 0) {
                return 0
            }
            ${h("Int","readCursor","buffer.writeCursor - buffer.pullAvailableLength")}
            buffer.pullAvailableLength -= 1
            return buffer.data[readCursor >= 0 ? readCursor : buffer.length + readCursor]
        `]),dependencies:[je]},Yt={namespace:Hn,code:({ns:e})=>g([u(e.writeSample,[s(e.SoundBuffer,"buffer"),s("Float","value")],"void")`
            buffer.data[buffer.writeCursor] = value
            buffer.writeCursor = (buffer.writeCursor + 1) % buffer.length
        `,u(e.readSample,[s(e.SoundBuffer,"buffer"),s("Int","offset")],"Float")`
            // R = (buffer.writeCursor - 1 - offset) -> ideal read position
            // W = R % buffer.length -> wrap it so that its within buffer length bounds (but could be negative)
            // (W + buffer.length) % buffer.length -> if W negative, (W + buffer.length) shifts it back to positive.
            return buffer.data[(buffer.length + ((buffer.writeCursor - 1 - offset) % buffer.length)) % buffer.length]
        `]),dependencies:[je]};var Ke="fs",qe={namespace:Ke,code:({ns:e},{msg:t},{target:n})=>{let r=[];return n==="assemblyscript"&&r.push(`
                type ${e.OperationId} = Int
                type ${e.OperationStatus} = Int
                type ${e.OperationCallback} = (
                    id: ${e.OperationId}, 
                    status: ${e.OperationStatus}
                ) => void
                type ${e.OperationSoundCallback} = (
                    id: ${e.OperationId}, 
                    status: ${e.OperationStatus}, 
                    sound: FloatArray[]
                ) => void
                type ${e.Url} = string
            `),g([...r,h("Int",e.OPERATION_SUCCESS,0 .toString()),h("Int",e.OPERATION_FAILURE,1 .toString()),h(`Set<${e.OperationId}>`,e._OPERATIONS_IDS,"new Set()"),h(`Map<${e.OperationId}, ${e.OperationCallback}>`,e._OPERATIONS_CALLBACKS,"new Map()"),h(`Map<${e.OperationId}, ${e.OperationSoundCallback}>`,e._OPERATIONS_SOUND_CALLBACKS,"new Map()"),s("Int",e._OPERATIONS_COUNTER,"1"),y(e.SoundInfo,[s("Int","channelCount"),s("Int","sampleRate"),s("Int","bitDepth"),s("string","encodingFormat"),s("string","endianness"),s("string","extraOptions")]),u(e.soundInfoToMessage,[s(e.SoundInfo,"soundInfo")],t.Message)`
                ${h(t.Message,"info",`${t.create}([
                    ${t.FLOAT_TOKEN},
                    ${t.FLOAT_TOKEN},
                    ${t.FLOAT_TOKEN},
                    ${t.STRING_TOKEN},
                    soundInfo.encodingFormat.length,
                    ${t.STRING_TOKEN},
                    soundInfo.endianness.length,
                    ${t.STRING_TOKEN},
                    soundInfo.extraOptions.length
                ])`)}
                ${t.writeFloatToken}(info, 0, toFloat(soundInfo.channelCount))
                ${t.writeFloatToken}(info, 1, toFloat(soundInfo.sampleRate))
                ${t.writeFloatToken}(info, 2, toFloat(soundInfo.bitDepth))
                ${t.writeStringToken}(info, 3, soundInfo.encodingFormat)
                ${t.writeStringToken}(info, 4, soundInfo.endianness)
                ${t.writeStringToken}(info, 5, soundInfo.extraOptions)
                return info
            `,u(e._assertOperationExists,[s(e.OperationId,"id"),s("string","operationName")],"void")`
                if (!${e._OPERATIONS_IDS}.has(id)) {
                    throw new Error(operationName + ' operation unknown : ' + id.toString())
                }
            `,u(e._createOperationId,[],e.OperationId)`
                ${h(e.OperationId,"id",`${e._OPERATIONS_COUNTER}++`)}
                ${e._OPERATIONS_IDS}.add(id)
                return id
            `])},dependencies:[X]},No={namespace:Ke,code:({ns:e})=>g([u(e.readSoundFile,[s(e.Url,"url"),s(e.SoundInfo,"soundInfo"),s(e.OperationSoundCallback,"callback")],e.OperationId)`
            ${h(e.OperationId,"id",`${e._createOperationId}()`)}
            ${e._OPERATIONS_SOUND_CALLBACKS}.set(id, callback)
            ${e.i_readSoundFile}(id, url, ${e.soundInfoToMessage}(soundInfo))
            return id
        `,u(e.x_onReadSoundFileResponse,[s(e.OperationId,"id"),s(e.OperationStatus,"status"),s("FloatArray[]","sound")],"void")`
            ${e._assertOperationExists}(id, "${e.x_onReadSoundFileResponse}")
            ${e._OPERATIONS_IDS}.delete(id)
            // Finish cleaning before calling the callback in case it would throw an error.
            const callback = ${e._OPERATIONS_SOUND_CALLBACKS}.get(id)
            callback(id, status, sound)
            ${e._OPERATIONS_SOUND_CALLBACKS}.delete(id)
        `]),exports:({ns:e})=>[e.x_onReadSoundFileResponse],imports:({ns:e},{msg:t})=>[u(e.i_readSoundFile,[s(e.OperationId,"id"),s(e.Url,"url"),s(t.Message,"info")],"void")``],dependencies:[qe]},Fo={namespace:Ke,code:({ns:e})=>g([u(e.writeSoundFile,[s("FloatArray[]","sound"),s(e.Url,"url"),s(e.SoundInfo,"soundInfo"),s(e.OperationCallback,"callback")],e.OperationId)`
            ${h(e.OperationId,"id",`${e._createOperationId}()`)}
            ${e._OPERATIONS_CALLBACKS}.set(id, callback)
            ${e.i_writeSoundFile}(id, sound, url, ${e.soundInfoToMessage}(soundInfo))
            return id
        `,u(e.x_onWriteSoundFileResponse,[s(e.OperationId,"id"),s(e.OperationStatus,"status")],"void")`
            ${e._assertOperationExists}(id, "${e.x_onWriteSoundFileResponse}")
            ${e._OPERATIONS_IDS}.delete(id)
            // Finish cleaning before calling the callback in case it would throw an error.
            ${h(e.OperationCallback,"callback",`${e._OPERATIONS_CALLBACKS}.get(id)`)}
            callback(id, status)
            ${e._OPERATIONS_CALLBACKS}.delete(id)
        `]),exports:({ns:e})=>[e.x_onWriteSoundFileResponse],imports:({ns:e},{msg:t})=>[u(e.i_writeSoundFile,[s(e.OperationId,"id"),s("FloatArray[]","sound"),s(e.Url,"url"),s(t.Message,"info")],"void")``],dependencies:[qe]},vo={namespace:Ke,code:({ns:e},{buf:t})=>g([h(`Map<${e.OperationId}, Array<${t.SoundBuffer}>>`,e.SOUND_STREAM_BUFFERS,"new Map()"),h("Int",e._SOUND_BUFFER_LENGTH,"20 * 44100"),u(e.closeSoundStream,[s(e.OperationId,"id"),s(e.OperationStatus,"status")],"void")`
            if (!${e._OPERATIONS_IDS}.has(id)) {
                return
            }
            ${e._OPERATIONS_IDS}.delete(id)
            ${e._OPERATIONS_CALLBACKS}.get(id)(id, status)
            ${e._OPERATIONS_CALLBACKS}.delete(id)
            // Delete this last, to give the callback 
            // a chance to save a reference to the buffer
            // If write stream, there won't be a buffer
            if (${e.SOUND_STREAM_BUFFERS}.has(id)) {
                ${e.SOUND_STREAM_BUFFERS}.delete(id)
            }
            ${e.i_closeSoundStream}(id, status)
        `,u(e.x_onCloseSoundStream,[s(e.OperationId,"id"),s(e.OperationStatus,"status")],"void")`
            ${e.closeSoundStream}(id, status)
        `]),exports:({ns:e})=>[e.x_onCloseSoundStream],imports:({ns:e})=>[u(e.i_closeSoundStream,[s(e.OperationId,"id"),s(e.OperationStatus,"status")],"void")``],dependencies:[je,qe]},Eo={namespace:Ke,code:({ns:e},{buf:t})=>g([u(e.openSoundReadStream,[s(e.Url,"url"),s(e.SoundInfo,"soundInfo"),s(e.OperationCallback,"callback")],e.OperationId)`
            ${h(e.OperationId,"id",`${e._createOperationId}()`)}
            ${h(`Array<${t.SoundBuffer}>`,"buffers","[]")}
            for (${s("Int","channel","0")}; channel < soundInfo.channelCount; channel++) {
                buffers.push(${t.create}(${e._SOUND_BUFFER_LENGTH}))
            }
            ${e.SOUND_STREAM_BUFFERS}.set(id, buffers)
            ${e._OPERATIONS_CALLBACKS}.set(id, callback)
            ${e.i_openSoundReadStream}(id, url, ${e.soundInfoToMessage}(soundInfo))
            return id
        `,u(e.x_onSoundStreamData,[s(e.OperationId,"id"),s("FloatArray[]","block")],"Int")`
            ${e._assertOperationExists}(id, "${e.x_onSoundStreamData}")
            const buffers = ${e.SOUND_STREAM_BUFFERS}.get(id)
            for (${s("Int","i","0")}; i < buffers.length; i++) {
                ${t.pushBlock}(buffers[i], block[i])
            }
            return buffers[0].pullAvailableLength
        `]),exports:({ns:e})=>[e.x_onSoundStreamData],imports:({ns:e},{msg:t})=>[u(e.i_openSoundReadStream,[s(e.OperationId,"id"),s(e.Url,"url"),s(t.Message,"info")],"void")``],dependencies:[vo,ko]},Oo={namespace:Ke,code:({ns:e})=>g([u(e.openSoundWriteStream,[s(e.Url,"url"),s(e.SoundInfo,"soundInfo"),s(e.OperationCallback,"callback")],e.OperationId)`
            const id = ${e._createOperationId}()
            ${e.SOUND_STREAM_BUFFERS}.set(id, [])
            ${e._OPERATIONS_CALLBACKS}.set(id, callback)
            ${e.i_openSoundWriteStream}(id, url, ${e.soundInfoToMessage}(soundInfo))
            return id
        `,u(e.sendSoundStreamData,[s(e.OperationId,"id"),s("FloatArray[]","block")],"void")`
            ${e._assertOperationExists}(id, "${e.sendSoundStreamData}")
            ${e.i_sendSoundStreamData}(id, block)
        `]),imports:({ns:e},{msg:t})=>[u(e.i_openSoundWriteStream,[s(e.OperationId,"id"),s(e.Url,"url"),s(t.Message,"info")],"void")``,u(e.i_sendSoundStreamData,[s(e.OperationId,"id"),s("FloatArray[]","block")],"void")``],dependencies:[vo]};var He={namespace:"soundFileOpenOpts",code:({ns:e},{msg:t,fs:n})=>u(e.parse,[s(t.Message,"m"),s(n.SoundInfo,"soundInfo")],"Set<Int>")`
            ${h("Set<Int>","unhandled","new Set()")}
            ${s("Int","i","0")}
            while (i < ${t.getLength}(m)) {
                if (${t.isStringToken}(m, i)) {
                    ${h("string","str",`${t.readStringToken}(m, i)`)}
                    if (['-wave', '-aiff', '-caf', '-next', '-ascii'].includes(str)) {
                        soundInfo.encodingFormat = str.slice(1)

                    } else if (str === '-raw') {
                        console.log('-raw format not yet supported')
                        i += 4
                        
                    } else if (str === '-big') {
                        soundInfo.endianness = 'b'

                    } else if (str === '-little') {
                        soundInfo.endianness = 'l'

                    } else if (str === '-bytes') {
                        if (i < ${t.getLength}(m) && ${t.isFloatToken}(m, i + 1)) {
                            soundInfo.bitDepth = toInt(${t.readFloatToken}(m, i + 1) * 8)
                            i++
                        } else {
                            console.log('failed to parse -bytes <value>')
                        }

                    } else if (str === '-rate') {
                        if (i < ${t.getLength}(m) && ${t.isFloatToken}(m, i + 1)) {
                            soundInfo.sampleRate = toInt(${t.readFloatToken}(m, i + 1))
                            i++
                        } else {
                            console.log('failed to parse -rate <value>')
                        }

                    } else {
                        unhandled.add(i)
                    }
                    
                } else {
                    unhandled.add(i)
                }
                i++
            }
            return unhandled
        `,dependencies:[X,qe]},Xt={namespace:"readWriteFsOpts",code:({ns:e},{msg:t,fs:n})=>u(e.parse,[s(t.Message,"m"),s(n.SoundInfo,"soundInfo"),s("Set<Int>","unhandledOptions")],"string")`
            // Remove the "open" token
            unhandledOptions.delete(0)

            ${s("string","url",'""')}
            ${s("boolean","urlFound","false")}
            ${s("boolean","errored","false")}
            ${s("Int","i","1")}
            while (i < ${t.getLength}(m)) {
                if (!unhandledOptions.has(i)) {

                } else if (${t.isStringToken}(m, i)) {
                    url = ${t.readStringToken}(m, i)
                    urlFound = true

                } else {
                    console.log("[writesf/readsf~] invalid option index " + i.toString())
                    errored = true
                }
                i++
            }
            if (!urlFound) {
                console.log("[writesf/readsf~] invalid options, file url not found")
                return ''
            }
            if (errored) {
                return ''
            }
            return url
        `,dependencies:[X,qe]};var Lo={translateArgs:e=>({channelCount:I(e.args[0])||1}),build:e=>({inlets:{0:{type:"message",id:"0"}},outlets:{...A(L(e.channelCount),t=>[`${t}`,{type:"signal",id:`${t}`}]),[`${e.channelCount}`]:{type:"message",id:`${e.channelCount}`}}})},Co={flags:{alphaName:"readsf_t"},state:({ns:e},{buf:t,fs:n})=>y(e.State,[s(`Array<${t.SoundBuffer}>`,"buffers","[]"),s(n.OperationId,"streamOperationId",-1),s("Int","readingStatus",0)]),messageReceivers:({ns:e,node:t,state:n},{actionUtils:r,msg:a})=>({0:f([s(a.Message,"m")])`
            if (${a.getLength}(m) >= 2) {
                if (${a.isStringToken}(m, 0) 
                    && ${a.readStringToken}(m, 0) === 'open'
                ) {
                    ${e.openStream}(
                        ${n},
                        m,
                        ${t.args.channelCount},
                        ${f()`
                            ${n}.streamOperationId = -1
                            if (${n}.readingStatus === 1) {
                                ${n}.readingStatus = 2
                            } else {
                                ${n}.readingStatus = 3
                            }
                        `}
                    )
                    return
                }
    
            } else if (${a.isMatching}(m, [${a.FLOAT_TOKEN}])) {
                if (${a.readFloatToken}(m, 0) === 0) {
                    ${n}.readingStatus = 3
                    return
    
                } else {
                    if (${n}.streamOperationId !== -1) {
                        ${n}.readingStatus = 1
                    } else {
                        console.log('[readsf~] start requested without prior open')
                    }
                    return
    
                }
                
            } else if (${r.isAction}(m, 'print')) {
                console.log('[readsf~] reading = ' + ${n}.readingStatus.toString())
                return
            }
        `}),dsp:({state:e,snds:t,outs:n,node:{args:{channelCount:r}}},{buf:a,bangUtils:o})=>c`
        switch(${e}.readingStatus) {
            case 1: 
                ${L(r).map(i=>`${n[i]} = ${a.pullSample}(${e}.buffers[${i}])`)}
                break
                
            case 2: 
                ${L(r).map(i=>`${n[i]} = ${a.pullSample}(${e}.buffers[${i}])`)}
                if (${e}.buffers[0].pullAvailableLength === 0) {
                    ${t[r]}(${o.bang}())
                    ${e}.readingStatus = 3
                }
                break
    
            case 3: 
                ${L(r).map(i=>`${n[i]} = 0`)}
                ${e}.readingStatus = 0
                break
        }
    `,core:({ns:e},{msg:t,fs:n,core:r,soundFileOpenOpts:a,readWriteFsOpts:o})=>g([u(e.openStream,[s(e.State,"state"),s(t.Message,"m"),s("Int","channelCount"),s(n.OperationCallback,"onStreamClose")],"void")`
                if (state.streamOperationId !== -1) {
                    state.readingStatus = 3
                    ${n.closeSoundStream}(state.streamOperationId, ${n.OPERATION_SUCCESS})
                }
        
                ${h(n.SoundInfo,"soundInfo",`{
                    channelCount,
                    sampleRate: toInt(${r.SAMPLE_RATE}),
                    bitDepth: 32,
                    encodingFormat: '',
                    endianness: '',
                    extraOptions: '',
                }`)}
                ${h("Set<Int>","unhandledOptions",`${a.parse}(
                    m,
                    soundInfo,
                )`)}
                ${h("string","url",`${o.parse}(
                    m,
                    soundInfo,
                    unhandledOptions
                )`)}
                if (url.length === 0) {
                    return
                }
                state.streamOperationId = ${n.openSoundReadStream}(
                    url,
                    soundInfo,
                    onStreamClose,
                )
                state.buffers = ${n.SOUND_STREAM_BUFFERS}.get(state.streamOperationId)
            `]),dependencies:[He,Xt,T,O,Eo]};var Ro=44100*5,Po={translateArgs:e=>({channelCount:I(e.args[0])||1}),build:({channelCount:e})=>({inlets:{"0_message":{type:"message",id:"0_message"},...A(L(e),t=>[`${t}`,{type:"signal",id:`${t}`}])},outlets:{},isPullingSignal:!0}),configureMessageToSignalConnection:e=>{if(e==="0")return{reroutedMessageInletId:"0_message"}}},Do={flags:{alphaName:"write_t"},state:({node:{args:e},ns:t},{fs:n})=>y(t.State,[s(n.OperationId,"operationId",-1),s("boolean","isWriting","false"),s("Array<FloatArray>","block",`[
                ${L(e.channelCount).map(()=>`createFloatArray(${Ro})`).join(",")}
            ]`),s("Int","cursor",0)]),dsp:({ns:e,state:t,ins:n,node:{args:r}})=>c`
        if (${t}.isWriting === true) {
            ${L(r.channelCount).map(a=>`${t}.block[${a}][${t}.cursor] = ${n[a]}`)}
            ${t}.cursor++
            if (${t}.cursor === ${Ro}) {
                ${e.flushBlock}(${t})
            }
        }
    `,messageReceivers:({ns:e,node:t,state:n},{core:r,msg:a,fs:o,actionUtils:i,soundFileOpenOpts:l,readWriteFsOpts:d})=>({"0_message":f([s(a.Message,"m")],"void")`
            if (${a.getLength}(m) >= 2) {
                if (
                    ${a.isStringToken}(m, 0) 
                    && ${a.readStringToken}(m, 0) === 'open'
                ) {
                    if (${n}.operationId !== -1) {
                        ${o.closeSoundStream}(${n}.operationId, ${o.OPERATION_SUCCESS})
                    }
    
                    ${h(o.SoundInfo,"soundInfo",`{
                        channelCount: ${t.args.channelCount},
                        sampleRate: toInt(${r.SAMPLE_RATE}),
                        bitDepth: 32,
                        encodingFormat: '',
                        endianness: '',
                        extraOptions: '',
                    }`)}
                    ${h("Set<Int>","unhandledOptions",`${l.parse}(
                        m,
                        soundInfo,
                    )`)}
                    ${h("string","url",`${d.parse}(
                        m,
                        soundInfo,
                        unhandledOptions
                    )`)}
                    if (url.length === 0) {
                        return
                    }
                    ${n}.operationId = ${o.openSoundWriteStream}(
                        url,
                        soundInfo,
                        () => {
                            ${e.flushBlock}(${n})
                            ${n}.operationId = -1
                        }
                    )
                    return
                }
    
            } else if (${i.isAction}(m, 'start')) {
                    ${n}.isWriting = true
                    return
    
            } else if (${i.isAction}(m, 'stop')) {
                ${e.flushBlock}(${n})
                ${n}.isWriting = false
                return
    
            } else if (${i.isAction}(m, 'print')) {
                console.log('[writesf~] writing = ' + ${n}.isWriting.toString())
                return
            }    
        `}),core:({ns:e},{fs:t})=>g([u(e.flushBlock,[s(e.State,"state")],"void")`
                ${h("Array<FloatArray>","block","[]")}
                for (${s("Int","i","0")}; i < state.block.length; i++) {
                    block.push(state.block[i].subarray(0, state.cursor))
                }
                ${t.sendSoundStreamData}(state.operationId, block)
                state.cursor = 0
            `]),dependencies:[He,Xt,O,Oo]};var Uo={translateArgs:({args:e})=>({frequency:I(e[0])||0,Q:I(e[1])||0}),build:()=>({inlets:{0:{type:"signal",id:"0"},"0_message":{type:"message",id:"0_message"},1:{type:"message",id:"1"},2:{type:"message",id:"2"}},outlets:{0:{type:"signal",id:"0"}}}),configureMessageToSignalConnection:e=>{if(e==="0")return{reroutedMessageInletId:"0_message"}}},Bo={flags:{alphaName:"filters_bp_t"},state:({node:{args:e},ns:t})=>y(t.State,[s("Float","frequency",e.frequency),s("Float","Q",e.Q),s("Float","coef1",0),s("Float","coef2",0),s("Float","gain",0),s("Float","y",0),s("Float","ym1",0),s("Float","ym2",0)]),initialization:({ns:e,state:t})=>c`
        ${e.updateCoefs}(${t})
    `,dsp:({ins:e,outs:t,state:n})=>c`
        ${n}.y = ${e.$0} + ${n}.coef1 * ${n}.ym1 + ${n}.coef2 * ${n}.ym2
        ${t.$0} = ${n}.gain * ${n}.y
        ${n}.ym2 = ${n}.ym1
        ${n}.ym1 = ${n}.y
    `,messageReceivers:({ns:e,state:t},{msg:n})=>({"0_message":f([s(n.Message,"m")],"void")`
            if (
                ${n.isMatching}(m)
                && ${n.readStringToken}(m, 0) === 'clear'
            ) {
                ${e.clear}()
                return 
            }
        `,1:F(e.setFrequency,t,n),2:F(e.setQ,t,n)}),core:({ns:e},{core:t})=>g([u(e.updateCoefs,[s(e.State,"state")],"void")`
                ${s("Float","omega",`state.frequency * (2.0 * Math.PI) / ${t.SAMPLE_RATE}`)}
                ${s("Float","oneminusr","state.Q < 0.001 ? 1.0 : Math.min(omega / state.Q, 1)")}
                ${s("Float","r","1.0 - oneminusr")}
                ${s("Float","sigbp_qcos",`(omega >= -(0.5 * Math.PI) && omega <= 0.5 * Math.PI) ? 
                    (((Math.pow(omega, 6) * (-1.0 / 720.0) + Math.pow(omega, 4) * (1.0 / 24)) - Math.pow(omega, 2) * 0.5) + 1)
                    : 0`)}
        
                state.coef1 = 2.0 * sigbp_qcos * r
                state.coef2 = - r * r
                state.gain = 2 * oneminusr * (oneminusr + r * omega)
            `,u(e.setFrequency,[s(e.State,"state"),s("Float","frequency")],"void")`
                state.frequency = (frequency < 0.001) ? 10: frequency
                ${e.updateCoefs}(state)
            `,u(e.setQ,[s(e.State,"state"),s("Float","Q")],"void")`
                state.Q = Math.max(Q, 0)
                ${e.updateCoefs}(state)
            `,u(e.clear,[s(e.State,"state")],"void")`
                state.ym1 = 0
                state.ym2 = 0
            `])};var pt={namespace:"sigBuses",code:({ns:e})=>g([h("Map<string, Float>",e._BUSES,"new Map()"),`${e._BUSES}.set('', 0)`,u(e.addAssign,[s("string","busName"),s("Float","value")],"Float")`
            ${h("Float","newValue",`${e._BUSES}.get(busName) + value`)}
            ${e._BUSES}.set(
                busName,
                newValue,
            )
            return newValue
        `,u(e.set,[s("string","busName"),s("Float","value")],"void")`
            ${e._BUSES}.set(
                busName,
                value,
            )
        `,u(e.reset,[s("string","busName")],"void")`
            ${e._BUSES}.set(busName, 0)
        `,u(e.read,[s("string","busName")],"Float")`
            return ${e._BUSES}.get(busName)
        `])},J={namespace:"msgBuses",code:({ns:e},{msg:t})=>g([h(`Map<string, Array<${t.Handler}>>`,e._BUSES,"new Map()"),u(e.publish,[s("string","busName"),s(t.Message,"message")],"void")`
            ${s("Int","i","0")}
            ${h(`Array<${t.Handler}>`,"callbacks",`${e._BUSES}.has(busName) ? ${e._BUSES}.get(busName): []`)}
            for (i = 0; i < callbacks.length; i++) {
                callbacks[i](message)
            }
        `,u(e.subscribe,[s("string","busName"),s(t.Handler,"callback")],"void")`
            if (!${e._BUSES}.has(busName)) {
                ${e._BUSES}.set(busName, [])
            }
            ${e._BUSES}.get(busName).push(callback)
        `,u(e.unsubscribe,[s("string","busName"),s(t.Handler,"callback")],"void")`
            if (!${e._BUSES}.has(busName)) {
                return
            }
            ${h(`Array<${t.Handler}>`,"callbacks",`${e._BUSES}.get(busName)`)}
            ${h("Int","found","callbacks.indexOf(callback)")}
            if (found !== -1) {
                callbacks.splice(found, 1)
            }
        `]),dependencies:[X]};var kd={translateArgs:e=>({busName:_(e.args[0])||""}),build:()=>({inlets:{0:{type:"signal",id:"0"},"0_message":{type:"message",id:"0_message"}},outlets:{},isPullingSignal:!0}),configureMessageToSignalConnection:e=>{if(e==="0")return{reroutedMessageInletId:"0_message"}}},Nd={translateArgs:e=>({busName:_(e.args[0])||""}),build:()=>({inlets:{0:{type:"message",id:"0"}},outlets:{0:{type:"signal",id:"0"}}})},Fd={translateArgs:e=>({busName:_(e.args[0])||""}),build:()=>({inlets:{0:{type:"signal",id:"0"}},outlets:{},isPullingSignal:!0})},vd={translateArgs:e=>({busName:_(e.args[0])||""}),build:()=>({inlets:{},outlets:{0:{type:"signal",id:"0"}}})},Jt=(e,{sigBuses:t})=>g([u(e.setBusName,[s(e.State,"state"),s("string","busName")],"void")`
            if (busName.length) {
                state.busName = busName
                ${t.reset}(state.busName)
            }
        `]),Qt={state:({ns:e})=>y(e.State,[s("string","busName",'""')]),initialization:({ns:e,node:{args:t},state:n})=>c`
        ${e.setBusName}(${n}, "${t.busName}")
    `},Ed={...Qt,flags:{alphaName:"throw_t"},dsp:({ins:e,state:t},{sigBuses:n})=>c`
        ${n.addAssign}(${t}.busName, ${e.$0})
    `,messageReceivers:({ns:e,state:t},{msg:n})=>({"0_message":f([s(n.Message,"m")],"void")`
            if (
                ${n.isMatching}(m, [${n.STRING_TOKEN}, ${n.STRING_TOKEN}])
                && ${n.readStringToken}(m, 0) === 'set'
            ) {
                ${e.setBusName}(${t}, ${n.readStringToken}(m, 1))
                return
            }
        `}),core:({ns:e},t)=>Jt(e,t),dependencies:[pt]},Od={...Qt,flags:{alphaName:"catch_t"},dsp:({outs:e,state:t},{sigBuses:n})=>c`
        ${e.$0} = ${n.read}(${t}.busName)
        ${n.reset}(${t}.busName)
    `,core:({ns:e},t)=>Jt(e,t),dependencies:[pt]},Ld={...Qt,flags:{alphaName:"send_t"},dsp:({state:e,ins:t},{sigBuses:n})=>c`
        ${n.set}(${e}.busName, ${t.$0})
    `,core:({ns:e},t)=>Jt(e,t),dependencies:[pt]},Cd={...Qt,flags:{alphaName:"receive_t",isDspInline:!0},dsp:({state:e},{sigBuses:t})=>c`${t.read}(${e}.busName)`,messageReceivers:({ns:e,state:t},{msg:n})=>({0:f([s(n.Message,"m")])`
            if (
                ${n.isMatching}(m, [${n.STRING_TOKEN}, ${n.STRING_TOKEN}])
                && ${n.readStringToken}(m, 0) === 'set'
            ) {
                ${e.setBusName}(${t}, ${n.readStringToken}(m, 1))
                return
            }
        `}),core:({ns:e},t)=>Jt(e,t),dependencies:[pt]},Wo={"throw~":kd,"catch~":vd,"send~":Fd,"receive~":Nd},Vo={"throw~":Ed,"catch~":Od,"send~":Ld,"receive~":Cd};var zo={translateArgs:e=>({rate:I(e.args[0])||0,unitAmount:I(e.args[1])||1,unit:_(e.args[2])||"msec"}),build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}},outlets:{0:{type:"message",id:"0"}}})},Go={state:({ns:e},{msg:t,sked:n})=>y(e.State,[s("Float","rate",0),s("Float","sampleRatio",1),s("Int","skedId",n.ID_NULL),s("Float","realNextTick",-1),s(t.Handler,"snd0",f([s(t.Message,"m")])``),s(n.Callback,"tickCallback",f()``)]),initialization:({ns:e,node:{args:t},state:n,snds:r},{core:a})=>c`
            ${n}.snd0 = ${r.$0}
            ${n}.sampleRatio = computeUnitInSamples(${a.SAMPLE_RATE}, ${t.unitAmount}, "${t.unit}")
            ${e.setRate}(${n}, ${t.rate})
            ${n}.tickCallback = ${f()`
                ${e.scheduleNextTick}(${n})
            `}
        `,messageReceivers:({ns:e,state:t},{core:n,msg:r,bangUtils:a,actionUtils:o})=>({0:f([s(r.Message,"m")])`
            if (${r.getLength}(m) === 1) {
                if (
                    (${r.isFloatToken}(m, 0) && ${r.readFloatToken}(m, 0) === 0)
                    || ${o.isAction}(m, 'stop')
                ) {
                    ${e.stop}(${t})
                    return
    
                } else if (
                    ${r.isFloatToken}(m, 0)
                    || ${a.isBang}(m)
                ) {
                    ${t}.realNextTick = toFloat(${n.FRAME})
                    ${e.scheduleNextTick}(${t})
                    return
                }
            }
        `,1:F(e.setRate,t,r)}),core:({ns:e},{bangUtils:t,commons:n,sked:r})=>g([u(e.setRate,[s(e.State,"state"),s("Float","rate")],"void")`
                state.rate = Math.max(rate, 0)
            `,u(e.scheduleNextTick,[s(e.State,"state")],"void")`
                state.snd0(${t.bang}())
                state.realNextTick = state.realNextTick + state.rate * state.sampleRatio
                state.skedId = ${n.waitFrame}(
                    toInt(Math.round(state.realNextTick)), 
                    state.tickCallback,
                )
            `,u(e.stop,[s(e.State,"state")],"void")`
                if (state.skedId !== ${r.ID_NULL}) {
                    ${n.cancelWaitFrame}(state.skedId)
                    state.skedId = ${r.ID_NULL}
                }
                state.realNextTick = 0
            `]),dependencies:[B,T,O,V]};var jo={translateArgs:e=>({unitAmount:I(e.args[0])||1,unit:_(e.args[1])||"msec"}),build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}},outlets:{0:{type:"message",id:"0"}}})},Ko={state:({ns:e})=>y(e.State,[s("Float","sampleRatio",0),s("Int","resetTime",0)]),initialization:({node:{args:e},state:t},{core:n})=>c`
            ${t}.sampleRatio = computeUnitInSamples(${n.SAMPLE_RATE}, ${e.unitAmount}, "${e.unit}")
        `,messageReceivers:({snds:e,state:t},{bangUtils:n,core:r,msg:a})=>({0:f([s(a.Message,"m")])`
            if (${n.isBang}(m)) {
                ${t}.resetTime = ${r.FRAME}
                return
    
            } else if (
                ${a.isMatching}(m, [${a.STRING_TOKEN}, ${a.FLOAT_TOKEN}, ${a.STRING_TOKEN}])
                && ${a.readStringToken}(m, 0) === 'tempo'
            ) {
                ${t}.sampleRatio = computeUnitInSamples(
                    ${r.SAMPLE_RATE}, 
                    ${a.readFloatToken}(m, 1), 
                    ${a.readStringToken}(m, 2)
                )
                return
            }
        `,1:f([s(a.Message,"m")])`
            if (${n.isBang}(m)) {
                ${e.$0}(${a.floats}([toFloat(${r.FRAME} - ${t}.resetTime) / ${t}.sampleRatio]))
                return
            }
        `}),dependencies:[B,T]};var qo={translateArgs:e=>({delay:I(e.args[0])||0,unitAmount:I(e.args[1])||1,unit:_(e.args[2])||"msec"}),build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}},outlets:{0:{type:"message",id:"0"}},isPushingMessages:!0})},Ho={state:({ns:e},{sked:t})=>y(e.State,[s("Float","delay",0),s("Float","sampleRatio",1),s(t.Id,"scheduledBang",t.ID_NULL)]),initialization:({ns:e,node:{args:t},state:n},{core:r})=>c`
        ${n}.sampleRatio = computeUnitInSamples(${r.SAMPLE_RATE}, ${t.unitAmount}, "${t.unit}")
        ${e.setDelay}(${n}, ${t.delay})
    `,messageReceivers:({ns:e,state:t,snds:n},{core:r,msg:a,bangUtils:o})=>({0:f([s(a.Message,"m")])`
            if (${a.getLength}(m) === 1) {
                if (${a.isStringToken}(m, 0)) {
                    ${h("string","action",`${a.readStringToken}(m, 0)`)}
                    if (action === 'bang' || action === 'start') {
                        ${e.scheduleDelay}(
                            ${t}, 
                            () => ${n.$0}(${o.bang}()),
                            ${r.FRAME},
                        )
                        return
                    } else if (action === 'stop') {
                        ${e.stop}(${t})
                        return
                    }
                    
                } else if (${a.isFloatToken}(m, 0)) {
                    ${e.setDelay}(${t}, ${a.readFloatToken}(m, 0))
                    ${e.scheduleDelay}(
                        ${t},
                        () => ${n.$0}(${o.bang}()),
                        ${r.FRAME},
                    )
                    return 
                }
            
            } else if (
                ${a.isMatching}(m, [${a.STRING_TOKEN}, ${a.FLOAT_TOKEN}, ${a.STRING_TOKEN}])
                && ${a.readStringToken}(m, 0) === 'tempo'
            ) {
                ${t}.sampleRatio = computeUnitInSamples(
                    ${r.SAMPLE_RATE}, 
                    ${a.readFloatToken}(m, 1), 
                    ${a.readStringToken}(m, 2)
                )
                return
            }
        `,1:F(e.setDelay,t,a)}),core:({ns:e},{sked:t,commons:n})=>g([u(e.setDelay,[s(e.State,"state"),s("Float","delay")],"void")`
                state.delay = Math.max(0, delay)
            `,u(e.scheduleDelay,[s(e.State,"state"),s(t.Callback,"callback"),s("Int","currentFrame")],"void")`
                if (state.scheduledBang !== ${t.ID_NULL}) {
                    ${e.stop}(state)
                }
                state.scheduledBang = ${n.waitFrame}(toInt(
                    Math.round(
                        toFloat(currentFrame) + state.delay * state.sampleRatio)),
                    callback
                )
            `,u(e.stop,[s(e.State,"state")],"void")`
                ${n.cancelWaitFrame}(state.scheduledBang)
                state.scheduledBang = ${t.ID_NULL}
            `]),dependencies:[B,T,V]};var D="empty",Le=()=>({inlets:{0:{type:"message",id:"0"}},outlets:{0:{type:"message",id:"0"}},isPushingMessages:!0}),Ye=(e,{msg:t,msgBuses:n})=>g([u(e.setReceiveBusName,[s(e.State,"state"),s("string","busName")],"void")`
            if (state.receiveBusName !== "${D}") {
                ${n.unsubscribe}(state.receiveBusName, state.messageReceiver)
            }
            state.receiveBusName = busName
            if (state.receiveBusName !== "${D}") {
                ${n.subscribe}(state.receiveBusName, state.messageReceiver)
            }
        `,u(e.setSendReceiveFromMessage,[s(e.State,"state"),s(t.Message,"m")],"boolean")`
            if (
                ${t.isMatching}(m, [${t.STRING_TOKEN}, ${t.STRING_TOKEN}])
                && ${t.readStringToken}(m, 0) === 'receive'
            ) {
                ${e.setReceiveBusName}(state, ${t.readStringToken}(m, 1))
                return true

            } else if (
                ${t.isMatching}(m, [${t.STRING_TOKEN}, ${t.STRING_TOKEN}])
                && ${t.readStringToken}(m, 0) === 'send'
            ) {
                state.sendBusName = ${t.readStringToken}(m, 1)
                return true
            }
            return false
        `,u(e.defaultMessageHandler,[s(t.Message,"m")],"void")``]);var Yn={translateArgs:({args:[e,t,n,r,a,o]})=>({minValue:G(e),maxValue:G(t),sendBusName:_(o)||D,receiveBusName:_(a)||D,initValue:n===1?G(r):0,outputOnLoad:!!n}),build:Le},Xn={translateArgs:({args:[e,t,n,r,a]})=>({minValue:0,maxValue:G(e),sendBusName:_(a)||D,receiveBusName:_(r)||D,initValue:t===1?G(n):0,outputOnLoad:!!t}),build:Le},Xe=({prepareStoreValue:e,prepareStoreValueBang:t,name:n})=>({flags:{alphaName:n},state:({ns:r,node:{args:a}},{msg:o})=>y(r.State,[s("Float","minValue",a.minValue),s("Float","maxValue",a.maxValue),s("Float","valueFloat",a.initValue),s(o.Message,"value",`${o.create}([])`),s("string","receiveBusName",`"${a.receiveBusName}"`),s("string","sendBusName",`"${a.sendBusName}"`),s(o.Handler,"messageReceiver",r.defaultMessageHandler),s(o.Handler,"messageSender",r.defaultMessageHandler)]),initialization:({ns:r,state:a,snds:o,node:{args:i}},{commons:l,msg:d})=>c`
                ${a}.messageSender = ${o.$0}
                ${a}.messageReceiver = ${f([s(d.Message,"m")])`
                    ${r.receiveMessage}(${a}, m)
                `}
                ${r.setReceiveBusName}(${a}, "${i.receiveBusName}")
    
                ${i.outputOnLoad?`${l.waitFrame}(0, () => ${o.$0}(${d.floats}([${a}.valueFloat])))`:null}
            `,messageReceivers:({ns:r,state:a},{msg:o})=>({0:f([s(o.Message,"m")])`
                ${r.receiveMessage}(${a}, m)
                return
            `}),core:({ns:r},a)=>{let{msgBuses:o,bangUtils:i,msg:l}=a;return g([Ye(r,a),u(r.receiveMessage,[s(r.State,"state"),s(l.Message,"m")],"void")`
                    if (${l.isMatching}(m, [${l.FLOAT_TOKEN}])) {
                        ${e?`state.valueFloat = ${e(`${l.readFloatToken}(m, 0)`)}`:`state.valueFloat = ${l.readFloatToken}(m, 0)`}
                        ${h(l.Message,"outMessage",`${l.floats}([state.valueFloat])`)}
                        state.messageSender(outMessage)
                        if (state.sendBusName !== "${D}") {
                            ${o.publish}(state.sendBusName, outMessage)
                        }
                        return
        
                    } else if (${i.isBang}(m)) {
                        ${t?`state.valueFloat = ${t("state.valueFloat")}`:null}
                        ${h(l.Message,"outMessage",`${l.floats}([state.valueFloat])`)}
                        state.messageSender(outMessage)
                        if (state.sendBusName !== "${D}") {
                            ${o.publish}(state.sendBusName, outMessage)
                        }
                        return
        
                    } else if (
                        ${l.isMatching}(m, [${l.STRING_TOKEN}, ${l.FLOAT_TOKEN}]) 
                        && ${l.readStringToken}(m, 0) === 'set'
                    ) {
                        ${e?`state.valueFloat = ${e(`${l.readFloatToken}(m, 1)`)}`:`state.valueFloat = ${l.readFloatToken}(m, 1)`}
                        return
                    
                    } else if (${r.setSendReceiveFromMessage}(state, m) === true) {
                        return
                    }
                `])},dependencies:[T,J,V]}),Yo={tgl:Xe({name:"tgl",prepareStoreValueBang:e=>`${e} === 0 ? state.maxValue: 0`}),nbx:Xe({name:"nbx",prepareStoreValue:e=>`Math.min(Math.max(${e},state.minValue),state.maxValue)`}),hsl:Xe({name:"hsl"}),vsl:Xe({name:"vsl"}),hradio:Xe({name:"hradio"}),vradio:Xe({name:"vradio"})},Xo={tgl:Xn,nbx:Yn,hsl:Yn,vsl:Yn,hradio:Xn,vradio:Xn};var Jo={translateArgs:({args:[e,t,n]})=>({outputOnLoad:!!e,sendBusName:_(n)||D,receiveBusName:_(t)||D}),build:Le},Qo={state:({ns:e,node:{args:t}},{msg:n})=>y(e.State,[s(n.Message,"value",`${n.create}([])`),s("string","receiveBusName",`"${t.receiveBusName}"`),s("string","sendBusName",`"${t.sendBusName}"`),s(n.Handler,"messageReceiver",e.defaultMessageHandler),s(n.Handler,"messageSender",e.defaultMessageHandler)]),initialization:({ns:e,snds:t,state:n,node:{args:r}},{commons:a,msg:o,bangUtils:i})=>c`
        ${n}.messageReceiver = ${f([s(o.Message,"m")])`
            ${e.receiveMessage}(${n}, m)
        `}
        ${n}.messageSender = ${t.$0}
        ${e.setReceiveBusName}(${n}, "${r.receiveBusName}")

        ${r.outputOnLoad?`${a.waitFrame}(0, () => ${t.$0}(${i.bang}()))`:null}
    `,messageReceivers:({ns:e,state:t},{msg:n})=>({0:f([s(n.Message,"m")])`
            ${e.receiveMessage}(${t}, m)
            return
        `}),core:({ns:e},t)=>{let{msg:n,msgBuses:r,bangUtils:a}=t;return g([Ye(e,t),u(e.receiveMessage,[s(e.State,"state"),s(n.Message,"m")],"void")`
                if (${e.setSendReceiveFromMessage}(state, m) === true) {
                    return
                }
                
                ${h(n.Message,"outMessage",`${a.bang}()`)}
                state.messageSender(outMessage)
                if (state.sendBusName !== "${D}") {
                    ${r.publish}(state.sendBusName, outMessage)
                }
                return
            `])},dependencies:[T,J,V]};var Jn={translateArgs:({args:[e,t,n,r]})=>({sendBusName:_(r)||D,receiveBusName:_(n)||D}),build:Le},Qn=({name:e,initValueCode:t,messageMatch:n})=>({flags:{alphaName:e},state:({ns:r,node:{args:a}},o)=>{let{msg:i}=o;return y(r.State,[s(i.Message,"value",t(o)),s("string","receiveBusName",`"${a.receiveBusName}"`),s("string","sendBusName",`"${a.sendBusName}"`),s(i.Handler,"messageReceiver",r.defaultMessageHandler),s(i.Handler,"messageSender",r.defaultMessageHandler)])},initialization:({ns:r,state:a,node:{args:o},snds:i},{msg:l})=>c`
            ${a}.messageReceiver = ${f([s(l.Message,"m")])`
                ${r.receiveMessage}(${a}, m)
            `}
            ${a}.messageSender = ${i.$0}
            ${r.setReceiveBusName}(${a}, "${o.receiveBusName}")
        `,messageReceivers:({ns:r,state:a},{msg:o})=>({0:f([s(o.Message,"m")])`
                ${r.receiveMessage}(${a}, m)
                return
            `}),core:({ns:r},a)=>{let{msg:o,msgBuses:i,bangUtils:l,msgUtils:d}=a;return g([Ye(r,a),u(r.receiveMessage,[s(r.State,"state"),s(o.Message,"m")],"void")`
                    if (${l.isBang}(m)) {
                        state.messageSender(state.value)
                        if (state.sendBusName !== "${D}") {
                            ${i.publish}(state.sendBusName, state.value)
                        }
                        return
                    
                    } else if (
                        ${o.getTokenType}(m, 0) === ${o.STRING_TOKEN}
                        && ${o.readStringToken}(m, 0) === 'set'
                    ) {
                        ${h(o.Message,"setMessage",`${d.slice}(m, 1, ${o.getLength}(m))`)}
                        ${n?`if (${n("setMessage",a)}) {`:null} 
                                state.value = setMessage    
                                return
                        ${n?"}":null}
        
                    } else if (${r.setSendReceiveFromMessage}(state, m) === true) {
                        return
                        
                    } ${n?`else if (${n("m",a)}) {`:"else {"}
                    
                        state.value = m
                        state.messageSender(state.value)
                        if (state.sendBusName !== "${D}") {
                            ${i.publish}(state.sendBusName, state.value)
                        }
                        return
        
                    }
                `])},dependencies:[T,J,ze]}),Zo={floatatom:Jn,symbolatom:Jn,listbox:Jn},es={floatatom:Qn({name:"floatatom",initValueCode:({msg:e})=>`${e.floats}([0])`,messageMatch:(e,{msg:t})=>`${t.isMatching}(${e}, [${t.FLOAT_TOKEN}])`}),symbolatom:Qn({name:"symbolatom",initValueCode:({msg:e})=>`${e.strings}([''])`,messageMatch:(e,{msg:t})=>`${t.isMatching}(${e}, [${t.STRING_TOKEN}])`}),listbox:Qn({name:"listbox",initValueCode:({bangUtils:e})=>`${e.bang}()`})};var ts={translateArgs:()=>({}),build:()=>({inlets:{},outlets:{0:{type:"message",id:"0"}},isPushingMessages:!0})},ns={initialization:({snds:e},{bangUtils:t,commons:n})=>c`${n.waitFrame}(0, () => ${e.$0}(${t.bang}()))`,dependencies:[T,V]};var Zt={namespace:"numbers",code:({ns:e})=>u(e.roundFloatAsPdInt,[s("Float","value")],"Float")`
            return value > 0 ? Math.floor(value): Math.ceil(value)
        `};var rs={translateArgs:e=>({value:I(e.args[0])||0}),build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}},outlets:{0:{type:"message",id:"0"}},isPushingMessages:!0})},as={state:({ns:e})=>y(e.State,[s("Float","value",0)]),initialization:({ns:e,node:{args:t},state:n})=>c`
            ${e.setValue}(${n}, ${t.value})
        `,messageReceivers:({ns:e,snds:t,state:n},{bangUtils:r,msg:a})=>({0:f([s(a.Message,"m")])`
            if (${a.isMatching}(m, [${a.FLOAT_TOKEN}])) {
                ${e.setValue}(${n}, ${a.readFloatToken}(m, 0))
                ${t.$0}(${a.floats}([${n}.value]))
                return 

            } else if (${r.isBang}(m)) {
                ${t.$0}(${a.floats}([${n}.value]))
                return
                
            }
        `,1:F(e.setValue,n,a)})},Rd={...as,core:({ns:e})=>g([u(e.setValue,[s(e.State,"state"),s("Float","value")],"void")`
                state.value = value
            `]),dependencies:[T]},Pd={...as,core:({ns:e},{numbers:t})=>g([u(e.setValue,[s(e.State,"state"),s("Float","value")],"void")`
                state.value = ${t.roundFloatAsPdInt}(value)
            `]),dependencies:[Zt,T]},os={float:rs,f:{aliasTo:"float"},int:rs,i:{aliasTo:"int"}},ss={float:Rd,int:Pd};var j={translateArgs:()=>({}),build:()=>({inlets:{0:{type:"message",id:"0"}},outlets:{0:{type:"message",id:"0"}}})},K=({generateOperation:e,dependencies:t=[]})=>({messageReceivers:({snds:n},r)=>{let{msg:a}=r;return{0:f([s(a.Message,"m")])`
                    if (${a.isMatching}(m, [${a.FLOAT_TOKEN}])) {
                        ${h("Float","value",`${a.readFloatToken}(m, 0)`)}
                        ${n.$0}(${a.floats}([${e(r)}]))
                        return
                    }
                `}},dependencies:t}),is={abs:K({generateOperation:()=>"Math.abs(value)"}),wrap:K({generateOperation:()=>"(1 + (value % 1)) % 1"}),cos:K({generateOperation:()=>"Math.cos(value)"}),sin:K({generateOperation:()=>"Math.sin(value)"}),tan:K({generateOperation:()=>"Math.tan(value)"}),atan:K({generateOperation:()=>"Math.atan(value)"}),exp:K({generateOperation:()=>"Math.exp(value)"}),sqrt:K({generateOperation:()=>"value >= 0 ? Math.pow(value, 0.5): 0"}),mtof:K({generateOperation:({funcs:e})=>`${e.mtof}(value)`,dependencies:[Gt]}),ftom:K({generateOperation:({funcs:e})=>`${e.ftom}(value)`,dependencies:[jt]}),rmstodb:K({generateOperation:()=>"value <= 0 ? 0 : 20 * Math.log(value) / Math.LN10 + 100"}),dbtorms:K({generateOperation:()=>"value <= 0 ? 0 : Math.exp(Math.LN10 * (value - 100) / 20)"}),powtodb:K({generateOperation:()=>"value <= 0 ? 0 : 10 * Math.log(value) / Math.LN10 + 100"}),dbtopow:K({generateOperation:()=>"value <= 0 ? 0 : Math.exp(Math.LN10 * (value - 100) / 10)"}),vu:K({generateOperation:()=>"value"})},ls={abs:j,cos:j,sin:j,tan:j,atan:j,exp:j,wrap:j,sqrt:j,mtof:j,ftom:j,rmstodb:j,dbtorms:j,powtodb:j,dbtopow:j,vu:j};var xe=e=>({translateArgs:t=>{let n=I(t.args[0]);return{value:n!==void 0?n:e}},build:()=>({inlets:{0:{type:"signal",id:"0"},1:{type:"signal",id:"1"}},outlets:{0:{type:"signal",id:"0"}}}),configureMessageToSignalConnection(t,n){if(t==="0")return{initialSignalValue:0};if(t==="1")return{initialSignalValue:n.value}}}),ds={"+~":{flags:{isPureFunction:!0,isDspInline:!0,alphaName:"add_t"},dsp:({ins:e})=>c`${e.$0} + ${e.$1}`},"-~":{flags:{isPureFunction:!0,isDspInline:!0,alphaName:"sub_t"},dsp:({ins:e})=>c`${e.$0} - ${e.$1}`},"*~":{flags:{isPureFunction:!0,isDspInline:!0,alphaName:"mul_t"},dsp:({ins:e})=>c`${e.$0} * ${e.$1}`},"/~":{flags:{isPureFunction:!0,isDspInline:!0,alphaName:"div_t"},dsp:({ins:e})=>c`${e.$1} !== 0 ? ${e.$0} / ${e.$1} : 0`},"min~":{flags:{isPureFunction:!0,isDspInline:!0,alphaName:"min_t"},dsp:({ins:e})=>c`Math.min(${e.$0}, ${e.$1})`},"max~":{flags:{isPureFunction:!0,isDspInline:!0,alphaName:"max_t"},dsp:({ins:e})=>c`Math.max(${e.$0}, ${e.$1})`},"pow~":{flags:{isPureFunction:!0,isDspInline:!0,alphaName:"pow_t"},dsp:({ins:e},{funcs:t})=>c`${t.pow}(${e.$0}, ${e.$1})`,dependencies:[Kt]},"log~":{flags:{isPureFunction:!0,isDspInline:!0,alphaName:"log_t"},dsp:({ins:e},{funcs:t})=>c`${t.log}(${e.$0}, ${e.$1} > 0 ? ${e.$1} : Math.E)`,dependencies:[qt]}},us={"+~":xe(0),"-~":xe(0),"*~":xe(0),"/~":xe(0),"min~":xe(0),"max~":xe(0),"pow~":xe(0),"log~":xe(Math.E)};var ps={translateArgs:()=>({}),build:()=>({inlets:{0:{type:"message",id:"0"}},outlets:{0:{type:"signal",id:"0"}}})},cs={flags:{alphaName:"noise_t",isDspInline:!0},dsp:()=>c`Math.random() * 2 - 1`,messageReceivers:(e,{msg:t})=>({0:f([s(t.Message,"m")])`
            if (
                ${t.isMatching}(m, [${t.STRING_TOKEN}, ${t.FLOAT_TOKEN}])
                && ${t.readStringToken}(m, 0) === 'seed'
            ) {
                console.log('WARNING : seed not implemented yet for [noise~]')
                return
            }
        `})};var en={namespace:"delayBuffers",code:({ns:e},{buf:t,sked:n})=>g([h(`Map<string, ${t.SoundBuffer}>`,e._BUFFERS,"new Map()"),h(n.Skeduler,e._SKEDULER,`${n.create}(true)`),h(`${t.SoundBuffer}`,e.NULL_BUFFER,`${t.create}(1)`),u(e.get,[s("string","delayName")],t.SoundBuffer)`
            ${e._BUFFERS}.get(delayName, buffer)
        `,u(e.set,[s("string","delayName"),s(t.SoundBuffer,"buffer")],"void")`
            ${e._BUFFERS}.set(delayName, buffer)
            ${n.emit}(${e._SKEDULER}, delayName)
        `,u(e.wait,[s("string","delayName"),s(n.Callback,"callback")],"void")`
            ${n.wait}(${e._SKEDULER}, delayName, callback)
        `,u(e.delete,[s("string","delayName")],"void")`
            ${e._BUFFERS}.delete(delayName)
        `]),dependencies:[je,ut]};var ms={translateArgs:({args:e})=>({delayName:_(e[0])||"",initDelayMsec:I(e[1])||0}),build:()=>({inlets:{0:{type:"signal",id:"0"}},outlets:{0:{type:"signal",id:"0"}}}),configureMessageToSignalConnection:(e,{initDelayMsec:t})=>{if(e==="0")return{initialSignalValue:t}}},hs={state:({ns:e},{buf:t,delayBuffers:n})=>y(e.State,[s("string","delayName",'""'),s(t.SoundBuffer,"buffer",n.NULL_BUFFER),s("Float","rawOffset",0),s("Int","offset",0),s("(_: string) => void","setDelayNameCallback",e.NOOP)]),initialization:({ns:e,node:{args:t},state:n},{delayBuffers:r})=>c`
        ${n}.setDelayNameCallback = ${f([s("string","_")])`
            ${n}.buffer = ${r._BUFFERS}.get(${n}.delayName)
            ${e.updateOffset}(${n})
        `}

        if ("${t.delayName}".length) {
            ${e.setDelayName}(${n}, "${t.delayName}", ${n}.setDelayNameCallback)
        }
    `,dsp:({ns:e,state:t,outs:n,ins:r},{buf:a})=>({inlets:{0:c`${e.setRawOffset}(${t}, ${r.$0})`},loop:c`${n.$0} = ${a.readSample}(${t}.buffer, ${t}.offset)`}),core:({ns:e},{core:t,sked:n,delayBuffers:r})=>g([u(e.setDelayName,[s(e.State,"state"),s("string","delayName"),s(n.Callback,"callback")])`
                if (state.delayName.length) {
                    state.buffer = ${r.NULL_BUFFER}
                }
                state.delayName = delayName
                if (state.delayName.length) {
                    ${r.wait}(state.delayName, callback)
                }
            `,u(e.setRawOffset,[s(e.State,"state"),s("Float","rawOffset")])`
                state.rawOffset = rawOffset
                ${e.updateOffset}(state)
            `,u(e.updateOffset,[s(e.State,"state")])`
                state.offset = toInt(Math.round(
                    Math.min(
                        Math.max(computeUnitInSamples(${t.SAMPLE_RATE}, state.rawOffset, "msec"), 0), 
                        toFloat(state.buffer.length - 1)
                    )
                ))
            `,u(e.NOOP,[s("string","_")])``]),dependencies:[B,en,Yt]},fs={"delread~":ms,"delread4~":ms},gs={"delread~":{...hs,flags:{alphaName:"delread_t"}},"delread4~":{...hs,flags:{alphaName:"delread4_t"}}};var ys={translateArgs:({args:e})=>({delayName:_(e[0])||"",maxDurationMsec:I(e[1])||100}),build:()=>({inlets:{0:{type:"signal",id:"0"},"0_message":{type:"message",id:"0_message"}},outlets:{},isPullingSignal:!0}),configureMessageToSignalConnection:e=>{if(e==="0")return{reroutedMessageInletId:"0_message"}}},$s={flags:{alphaName:"delwrite_t"},state:({ns:e},{buf:t,delayBuffers:n})=>y(e.State,[s("string","delayName",'""'),s(t.SoundBuffer,"buffer",n.NULL_BUFFER)]),initialization:({ns:e,node:{args:t},state:n},{buf:r,core:a})=>c`
        ${n}.buffer = ${r.create}(
            toInt(Math.ceil(computeUnitInSamples(
                ${a.SAMPLE_RATE}, 
                ${t.maxDurationMsec},
                "msec"
            )))
        )
        if ("${t.delayName}".length) {
            ${e.setDelayName}(${n}, "${t.delayName}")
        }
    `,dsp:({ins:e,state:t},{buf:n})=>c`${n.writeSample}(${t}.buffer, ${e.$0})`,messageReceivers:({state:e},{buf:t,msg:n,actionUtils:r})=>({"0_message":f([s(n.Message,"m")],"void")`
            if (${r.isAction}(m, 'clear')) {
                ${t.clear}(${e}.buffer)
                return
            }
        `}),core:({ns:e},{delayBuffers:t})=>g([u(e.setDelayName,[s(e.State,"state"),s("string","delayName")],"void")`
                if (state.delayName.length) {
                    ${t.delete}(state.delayName)
                }
                state.delayName = delayName
                if (state.delayName.length) {
                    ${t.set}(state.delayName, state.buffer)
                }
            `]),dependencies:[B,en,O,Yt]};var Zn={translateArgs:({args:e})=>({initValue:I(e[0])||0}),build:()=>({inlets:{0:{type:"signal",id:"0"},1:{type:"signal",id:"1"}},outlets:{0:{type:"signal",id:"0"}}}),configureMessageToSignalConnection:(e,{initValue:t})=>{if(e==="1")return{initialSignalValue:t}}},er=({generateOperation:e,alphaName:t})=>({flags:{alphaName:t},state:({ns:n})=>y(n.State,[s("Float","lastOutput",0),s("Float","lastInput",0)]),dsp:({ins:n,state:r,outs:a})=>c`
            ${r}.lastOutput = ${a.$0} = ${e(n.$0,n.$1,`${r}.lastOutput`,`${r}.lastInput`)}
            ${r}.lastInput = ${n.$0}
        `}),Ss={"rpole~":Zn,"rzero~":Zn,"rzero_rev~":Zn},Is={"rpole~":er({alphaName:"rpole_t",generateOperation:(e,t,n)=>`${e} + ${t} * ${n}`}),"rzero~":er({alphaName:"rzero_t",generateOperation:(e,t,n,r)=>`${e} - ${t} * ${r}`}),"rzero_rev~":er({alphaName:"rzero_rev_t",generateOperation:(e,t,n,r)=>`${r} - ${t} * ${e}`})};var bs={translateArgs:({args:e})=>({initCoeffRe:I(e[0])||0,initCoeffIm:I(e[1])||0}),build:()=>({inlets:{0:{type:"signal",id:"0"},1:{type:"signal",id:"1"},2:{type:"signal",id:"2"},3:{type:"signal",id:"3"}},outlets:{0:{type:"signal",id:"0"},1:{type:"signal",id:"1"}}}),configureMessageToSignalConnection:(e,{initCoeffIm:t,initCoeffRe:n})=>{if(e==="0")return{initialSignalValue:0};if(e==="1")return{initialSignalValue:0};if(e==="2")return{initialSignalValue:n};if(e==="3")return{initialSignalValue:t}}},ws=({generateOperationRe:e,generateOperationIm:t,alphaName:n})=>({flags:{alphaName:n},state:({ns:r})=>y(r.State,[s("Float","lastOutputRe",0),s("Float","lastOutputIm",0),s("Float","lastInputRe",0),s("Float","lastInputIm",0)]),dsp:({ins:r,state:a,outs:o})=>c`
            ${o.$0} = ${e(r.$0,r.$1,r.$2,r.$3,`${a}.lastOutputRe`,`${a}.lastOutputIm`,`${a}.lastInputRe`,`${a}.lastInputIm`)}
            ${a}.lastOutputIm = ${o.$1} = ${t(r.$0,r.$1,r.$2,r.$3,`${a}.lastOutputRe`,`${a}.lastOutputIm`,`${a}.lastInputRe`,`${a}.lastInputIm`)}
            ${a}.lastOutputRe    = ${o.$0}
            ${a}.lastInputRe = ${r.$0}
            ${a}.lastInputIm = ${r.$1}
        `}),Ts={"cpole~":bs,"czero~":bs},xs={"cpole~":ws({alphaName:"cpole_t",generateOperationRe:(e,t,n,r,a,o)=>`${e} + ${a} * ${n} - ${o} * ${r}`,generateOperationIm:(e,t,n,r,a,o)=>`${t} + ${a} * ${r} + ${o} * ${n}`}),"czero~":ws({alphaName:"czero_t",generateOperationRe:(e,t,n,r,a,o,i,l)=>`${e} - ${i} * ${n} + ${l} * ${r}`,generateOperationIm:(e,t,n,r,a,o,i,l)=>`${t} - ${i} * ${r} - ${l} * ${n}`})};var _s={translateArgs:({args:e})=>({initValue:I(e[0])||0}),build:()=>({inlets:{0:{type:"signal",id:"0"},1:{type:"signal",id:"1"}},outlets:{0:{type:"signal",id:"0"}}}),configureMessageToSignalConnection:(e,t)=>{if(e==="1")return{initialSignalValue:t.initValue}}},As={flags:{alphaName:"hip_t"},state:({ns:e})=>y(e.State,[s("Float","previous",0),s("Float","current",0),s("Float","coeff",0),s("Float","normal",0)]),dsp:({ins:e,state:t,outs:n},{core:r})=>({inlets:{1:c`
                ${t}.coeff = Math.min(Math.max(1 - ${e.$1} * (2 * Math.PI) / ${r.SAMPLE_RATE}, 0), 1)
                ${t}.normal = 0.5 * (1 + ${t}.coeff)
            `},loop:c`
            ${t}.current = ${e.$0} + ${t}.coeff * ${t}.previous
            ${n.$0} = ${t}.normal * (${t}.current - ${t}.previous)
            ${t}.previous = ${t}.current
        `})};var Ms={translateArgs:({args:e})=>({frequency:I(e[0])||0}),build:()=>({inlets:{0:{type:"signal",id:"0"},1:{type:"signal",id:"1"}},outlets:{0:{type:"signal",id:"0"}}}),configureMessageToSignalConnection:(e,t)=>{if(e==="1")return{initialSignalValue:t.frequency}}},ks={flags:{alphaName:"lop_t"},state:({ns:e})=>y(e.State,[s("Float","previous",0),s("Float","coeff",0)]),dsp:({ns:e,ins:t,state:n,outs:r})=>({inlets:{1:c`${e.setFreq}(${n}, ${t.$1})`},loop:c`${n}.previous = ${r.$0} = ${n}.coeff * ${t.$0} + (1 - ${n}.coeff) * ${n}.previous`}),messageReceivers:({ns:e,state:t},{msg:n})=>({1:F(e.setFreq,t,n)}),core:({ns:e},{core:t})=>g([u(e.setFreq,[s(e.State,"state"),s("Float","freq")],"void")`
                state.coeff = Math.max(Math.min(freq * 2 * Math.PI / ${t.SAMPLE_RATE}, 1), 0)
            `])};var Ns={translateArgs:({args:e})=>({frequency:I(e[0])||0,Q:I(e[1])||0}),build:()=>({inlets:{0:{type:"signal",id:"0"},1:{type:"signal",id:"1"},2:{type:"message",id:"2"}},outlets:{0:{type:"signal",id:"0"},1:{type:"signal",id:"1"}}})},Fs={flags:{alphaName:"vcf_t"},state:({node:{args:e},ns:t})=>y(t.State,[s("Float","frequency",e.frequency),s("Float","Q",e.Q),s("Float","coef1",0),s("Float","coef2",0),s("Float","gain",0),s("Float","y",0),s("Float","ym1",0),s("Float","ym2",0)]),dsp:({ns:e,ins:t,outs:n,state:r})=>({inlets:{1:c`
                ${e.setFrequency}(${r}, ${t.$1})
            `},loop:c`
            ${r}.y = ${t.$0} + ${r}.coef1 * ${r}.ym1 + ${r}.coef2 * ${r}.ym2
            ${n.$1} = ${n.$0} = ${r}.gain * ${r}.y
            ${r}.ym2 = ${r}.ym1
            ${r}.ym1 = ${r}.y
        `}),messageReceivers:({ns:e,state:t},{msg:n})=>({2:F(e.setQ,t,n)}),core:({ns:e},{core:t})=>g([u(e.updateCoefs,[s(e.State,"state")],"void")`
                ${s("Float","omega",`state.frequency * (2.0 * Math.PI) / ${t.SAMPLE_RATE}`)}
                ${s("Float","oneminusr","state.Q < 0.001 ? 1.0 : Math.min(omega / state.Q, 1)")}
                ${s("Float","r","1.0 - oneminusr")}
                ${s("Float","sigbp_qcos",`(omega >= -(0.5 * Math.PI) && omega <= 0.5 * Math.PI) ? 
                    (((Math.pow(omega, 6) * (-1.0 / 720.0) + Math.pow(omega, 4) * (1.0 / 24)) - Math.pow(omega, 2) * 0.5) + 1)
                    : 0`)}
        
                state.coef1 = 2.0 * sigbp_qcos * r
                state.coef2 = - r * r
                state.gain = 2 * oneminusr * (oneminusr + r * omega)
            `,u(e.setFrequency,[s(e.State,"state"),s("Float","frequency")],"void")`
                state.frequency = (frequency < 0.001) ? 10: frequency
                ${e.updateCoefs}(state)
            `,u(e.setQ,[s(e.State,"state"),s("Float","Q")],"void")`
                state.Q = Math.max(Q, 0)
                ${e.updateCoefs}(state)
            `])};var vs={skipDollarArgsResolution:!0,translateArgs:({args:e})=>{let t=[{tokens:[],send:null}],n=0,r=null;for(;n<e.length;){let a=e[n++];if(a===","||a===";"){if(n===e.length)continue;if(a===";"){let o=e[n++];if(typeof o!="string")throw new Error(`Expected a string after ";" from [msg( with args [${e.join(" ")}]`);r=o}t.push({tokens:[],send:r})}else t[t.length-1].tokens.push(a)}return{msgSpecs:t.filter(a=>a.tokens.length).map(a=>(a.tokens[0]==="symbol"&&(a.tokens=[typeof a.tokens[1]=="string"?a.tokens[1]:""]),a))}},build:()=>({inlets:{0:{type:"message",id:"0"}},outlets:{0:{type:"message",id:"0"}}})},Es={state:({ns:e})=>y(e.State,[s(`Array<${e.TokenSpec}>`,"msgSpecs","[]")]),initialization:(e,t)=>{let{node:{args:n},state:r}=e,{msg:a}=t,o=n.msgSpecs.map((i,l)=>Dd(e,t,i,l));return c`
            ${r}.msgSpecs = [
                ${o.map(({isStaticMsg:i,code:l},d)=>c`
                    {
                        transferFunction: ${f([s(a.Message,"inMessage")],a.Message)`
                            ${i?null:l}
                            return ${r}.msgSpecs[${d}].outMessage
                        `},
                        outTemplate: [],
                        outMessage: ${a.EMPTY_MESSAGE},
                        send: ${n.msgSpecs[d].send?`"${n.msgSpecs[d].send}"`:'""'},
                        hasSend: ${n.msgSpecs[d].send?"true":"false"},
                    },`)}
            ]

            ${o.filter(({isStaticMsg:i})=>i).map(({code:i})=>i)}
        `},messageReceivers:({snds:e,state:t},{msg:n,msgBuses:r})=>({0:f([s(n.Message,"m")])`
                if (
                    ${n.isStringToken}(m, 0) 
                    && ${n.readStringToken}(m, 0) === 'set'
                ) {
                    ${h(n.Template,"outTemplate","[]")}
                    for (${s("Int","i","1")}; i < ${n.getLength}(m); i++) {
                        if (${n.isFloatToken}(m, i)) {
                            outTemplate.push(${n.FLOAT_TOKEN})
                        } else {
                            outTemplate.push(${n.STRING_TOKEN})
                            outTemplate.push(${n.readStringToken}(m, i).length)
                        }
                    }

                    ${h(n.Message,"outMessage",`${n.create}(outTemplate)`)}
                    for (${s("Int","i","1")}; i < ${n.getLength}(m); i++) {
                        if (${n.isFloatToken}(m, i)) {
                            ${n.writeFloatToken}(
                                outMessage, i - 1, ${n.readFloatToken}(m, i)
                            )
                        } else {
                            ${n.writeStringToken}(
                                outMessage, i - 1, ${n.readStringToken}(m, i)
                            )
                        }
                    }

                    ${t}.msgSpecs.splice(0, ${t}.msgSpecs.length - 1)
                    ${t}.msgSpecs[0] = {
                        transferFunction: ${f([s(n.Message,"m")],n.Message)`
                            return ${t}.msgSpecs[0].outMessage
                        `},
                        outTemplate: outTemplate,
                        outMessage: outMessage,
                        send: "",
                        hasSend: false,
                    }
                    return
    
                } else {
                    for (${s("Int","i","0")}; i < ${t}.msgSpecs.length; i++) {
                        if (${t}.msgSpecs[i].hasSend) {
                            ${r.publish}(${t}.msgSpecs[i].send, ${t}.msgSpecs[i].transferFunction(m))
                        } else {
                            ${e.$0}(${t}.msgSpecs[i].transferFunction(m))
                        }
                    }
                    return
                }
            `}),core:({ns:e},{msg:t})=>g([y(e.TokenSpec,[s(`(m: ${t.Message}) => ${t.Message}`,"transferFunction"),s(t.Template,"outTemplate"),s(t.Message,"outMessage"),s("string","send"),s("boolean","hasSend")])]),dependencies:[J]},Dd=({state:e},{msg:t},n,r)=>{let a=`${e}.msgSpecs[${r}].outTemplate`,o=`${e}.msgSpecs[${r}].outMessage`,i=[],l=[],d=0,p=!1,m=!0;n.tokens.forEach((M,x)=>{let k=Ud(M);if(k.type==="noop"){m=!1;let{inIndex:E}=k;i.push(c`
                ${a}.push(${t.getTokenType}(inMessage, ${E}))
                if (${t.isStringToken}(inMessage, ${E})) {
                    stringMem[${d}] = ${t.readStringToken}(inMessage, ${E})
                    ${a}.push(stringMem[${d}].length)
                }
            `),l.push(c`
                if (${t.isFloatToken}(inMessage, ${E})) {
                    ${t.writeFloatToken}(${o}, ${x}, ${t.readFloatToken}(inMessage, ${E}))
                } else if (${t.isStringToken}(inMessage, ${E})) {
                    ${t.writeStringToken}(${o}, ${x}, stringMem[${d}])
                }
            `),d++}else k.type==="string-template"?(m=!1,p=!0,i.push(c`
                stringToken = "${k.template}"
                ${k.variables.map(({placeholder:E,inIndex:ae})=>`
                    if (${t.isFloatToken}(inMessage, ${ae})) {
                        otherStringToken = ${t.readFloatToken}(inMessage, ${ae}).toString()
                        if (otherStringToken.endsWith('.0')) {
                            otherStringToken = otherStringToken.slice(0, -2)
                        }
                        stringToken = stringToken.replace("${E}", otherStringToken)
                    } else if (${t.isStringToken}(inMessage, ${ae})) {
                        stringToken = stringToken.replace("${E}", ${t.readStringToken}(inMessage, ${ae}))
                    }`).join(`
`)}
                stringMem[${d}] = stringToken
                ${a}.push(${t.STRING_TOKEN})
                ${a}.push(stringMem[${d}].length)
            `),l.push(c`
                ${t.writeStringToken}(${o}, ${x}, stringMem[${d}])
            `),d++):k.type==="string-constant"?(i.push(c`
                ${a}.push(${t.STRING_TOKEN})
                ${a}.push(${k.value.length})
            `),l.push(c`
                ${t.writeStringToken}(${o}, ${x}, "${k.value}")
            `)):k.type==="float-constant"&&(i.push(c`
                ${a}.push(${t.FLOAT_TOKEN})
            `),l.push(c`
                ${t.writeFloatToken}(${o}, ${x}, ${k.value})
            `))});let $=c`
        ${p?s("string","stringToken"):null}
        ${p?s("string","otherStringToken"):null}
        ${m?null:s("Array<string>","stringMem","[]")}
    `;return i.unshift(c`${a} = []`),l.unshift(c`${o} = ${t.create}(${a})`),{isStaticMsg:m,code:g([$,...i,...l])}},Ud=e=>{if(typeof e=="string"){let t=Bd.exec(e);if(t&&t[0]===e)return{type:"noop",inIndex:parseInt(t[1],10)-1};if(t){let n=[],r;for(;r=Wd.exec(e);)n.push({placeholder:r[0],inIndex:parseInt(r[1],10)-1});return{type:"string-template",template:e,variables:n}}else return{type:"string-constant",value:e}}else return{type:"float-constant",value:e}},Bd=/\$(\d+)/,Wd=/\$(\d+)/g;var Os={translateArgs:({args:e})=>{let t=_(e[0])||"append",n=e.slice(1);switch(t){case"split":n=[I(e[1])||0];break;case"trim":case"length":n=[];break;case"append":case"prepend":break;case"fromsymbol":case"tosymbol":case"store":throw new Error(`list operation ${t} not implemented yet`);default:throw new Error(`invalid list operation ${t}`)}return{operation:t,operationArgs:n}},build:({operation:e})=>{let t=0,n=0;switch(e){case"split":t=2,n=3;break;case"trim":case"length":t=1,n=1;break;case"prepend":case"append":t=2,n=1;break}return{inlets:A(L(t),r=>[`${r}`,{type:"message",id:`${r}`}]),outlets:A(L(n),r=>[`${r}`,{type:"message",id:`${r}`}])}}},Ls={state:({ns:e},{msg:t})=>y(e.State,[s("Int","splitPoint",0),s(t.Message,"currentList",`${t.create}([])`)]),initialization:({node:{args:e},state:t},{msg:n})=>c`
        ${e.operation==="split"?`${t}.splitPoint = ${e.operationArgs[0]}`:null}

        ${e.operation==="append"||e.operation==="prepend"?c` 
            {
                ${h(n.Template,"template",`[${e.operationArgs.map(r=>typeof r=="string"?`${n.STRING_TOKEN},${r.length}`:`${n.FLOAT_TOKEN}`).join(",")}]`)}

                ${t}.currentList = ${n.create}(template)

                ${e.operationArgs.map((r,a)=>typeof r=="string"?`${n.writeStringToken}(${t}.currentList, ${a}, "${r}")`:`${n.writeFloatToken}(${t}.currentList, ${a}, ${r})`)}
            }
        `:null}
    `,messageReceivers:({ns:e,snds:t,state:n,node:{args:r}},{bangUtils:a,msgUtils:o,msg:i})=>{let l=h(i.Message,"inMessage",`${a.isBang}(m) ? ${i.create}([]): m`);switch(r.operation){case"split":return{0:f([s(i.Message,"m")])`
                        ${l}
                        if (${i.getLength}(inMessage) < ${n}.splitPoint) {
                            ${t.$2}(m)
                            return
                        } else if (${i.getLength}(inMessage) === ${n}.splitPoint) {
                            ${t.$1}(${a.bang}())
                            ${t.$0}(m)
                            return
                        }
                        ${h(i.Message,"outMessage1",`${o.slice}(inMessage, ${n}.splitPoint, ${i.getLength}(inMessage))`)}
                        ${h(i.Message,"outMessage0",`${o.slice}(inMessage, 0, ${n}.splitPoint)`)}
                        ${t.$1}(${i.getLength}(outMessage1) === 0 ? ${a.bang}(): outMessage1)
                        ${t.$0}(${i.getLength}(outMessage0) === 0 ? ${a.bang}(): outMessage0)
                        return
                    `,1:F(e.setSplitPoint,n,i)};case"trim":return{0:f([s(i.Message,"m")])`
                        ${t.$0}(m)
                        return
                    `};case"length":return{0:f([s(i.Message,"m")])`
                        if (${a.isBang}(m)) {
                            ${t.$0}(${i.floats}([0]))
                        } else {
                            ${t.$0}(${i.floats}([toFloat(${i.getLength}(m))]))
                        }
                        return
                    `};case"append":case"prepend":let d=r.operation==="prepend"?`${o.concat}(${n}.currentList, m)`:`${o.concat}(m, ${n}.currentList)`;return{0:f([s(i.Message,"m")])`
                        if (${a.isBang}(m)) {
                            ${t.$0}(${i.getLength}(${n}.currentList) === 0 ? ${a.bang}(): ${n}.currentList)
                        } else {
                            ${t.$0}(${i.getLength}(${n}.currentList) === 0 && ${i.getLength}(m) === 0 ? ${a.bang}(): ${d})
                        }
                        return
                    `,1:f([s(i.Message,"m")])`
                        ${l}
                        ${n}.currentList = inMessage
                        return
                    `};default:throw new Error(`unknown list operation ${r.operation}`)}},core:({ns:e})=>g([u(e.setSplitPoint,[s(e.State,"state"),s("Float","value")],"void")`
                state.splitPoint = toInt(value)
            `]),dependencies:[T,ze]};var Cs={translateArgs:e=>({value:_(e.args[0])||""}),build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}},outlets:{0:{type:"message",id:"0"}},isPushingMessages:!0})},Rs={state:({node:{args:e},ns:t})=>y(t.State,[s("string","value",`"${e.value}"`)]),messageReceivers:({snds:e,state:t},{msg:n,bangUtils:r})=>({0:f([s(n.Message,"m")])`
            if (${r.isBang}(m)) {
                ${e.$0}(${n.strings}([${t}.value]))
                return
    
            } else if (${n.isMatching}(m, [${n.STRING_TOKEN}])) {
                ${t}.value = ${n.readStringToken}(m, 0)
                ${e.$0}(${n.strings}([${t}.value]))
                return
    
            }
        `,1:f([s(n.Message,"m")])`
            if (${n.isMatching}(m, [${n.STRING_TOKEN}])) {
                ${t}.value = ${n.readStringToken}(m, 0)
                return 
            }
        `}),dependencies:[T,J]};var Vd={translateArgs:e=>({busName:_(e.args[0])||""}),build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}},outlets:{}})},zd={translateArgs:e=>({busName:_(e.args[0])||""}),build:()=>({inlets:{},outlets:{0:{type:"message",id:"0"}},isPushingMessages:!0})},Gd={state:({node:{args:e},ns:t})=>y(t.State,[s("string","busName",`"${e.busName}"`)]),messageReceivers:({state:e},{msgBuses:t,msg:n})=>({0:f([s(n.Message,"m")])`
            ${t.publish}(${e}.busName, m)
            return
        `,1:Vr(`${e}.busName`,n)}),dependencies:[J]},jd={initialization:({node:{args:e},snds:t},{msgBuses:n})=>c`
            ${n.subscribe}("${e.busName}", ${t.$0})
        `,dependencies:[J]},tr={send:Vd,receive:zd},Ps={send:Gd,receive:jd};var Ds={translateArgs:()=>({}),build:()=>({inlets:{0:{type:"message",id:"0"}},outlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}}})},Us={state:({ns:e},{fs:t})=>y(e.State,[s(`Map<${t.OperationId}, ${e.Operation}>`,"operations","new Map()")]),messageReceivers:({ns:e,state:t,snds:n},{msg:r,fs:a,core:o,commons:i,soundFileOpenOpts:l})=>({0:f([s(r.Message,"m")])`
            if (
                ${r.getLength}(m) >= 3 
                && ${r.isStringToken}(m, 0)
                && (
                    ${r.readStringToken}(m, 0) === 'read'
                    || ${r.readStringToken}(m, 0) === 'write'
                )
            ) {
                ${h("string","operationType",`${r.readStringToken}(m, 0)`)}
                ${h(a.SoundInfo,"soundInfo",`{
                    channelCount: 0,
                    sampleRate: toInt(${o.SAMPLE_RATE}),
                    bitDepth: 32,
                    encodingFormat: '',
                    endianness: '',
                    extraOptions: '',
                }`)}
                ${h(e.Operation,"operation",`{
                    arrayNames: [],
                    resize: false,
                    maxSize: -1,
                    skip: 0,
                    framesToWrite: 0,
                    url: '',
                    soundInfo,
                }`)}
                ${s("Set<Int>","unhandledOptions",`${l.parse}(
                    m,
                    soundInfo,
                )`)}
                
                // Remove the operation type
                unhandledOptions.delete(0)
                
                ${s("Int","i","1")}
                ${s("string","str",'""')}
                while (i < ${r.getLength}(m)) {
                    if (!unhandledOptions.has(i)) {

                    } else if (${r.isStringToken}(m, i)) {
                        str = ${r.readStringToken}(m, i)
                        if (str === '-resize') {
                            unhandledOptions.delete(i)
                            operation.resize = true

                        } else if (str === '-maxsize' || str === '-nframes') {
                            unhandledOptions.delete(i)
                            if (
                                i + 1 >= ${r.getLength}(m) 
                                || !${r.isFloatToken}(m, i + 1)
                            ) {
                                console.log("invalid value for -maxsize")
                            }
                            operation.maxSize = ${r.readFloatToken}(m, i + 1)
                            unhandledOptions.delete(i + 1)
                            i++

                        } else if (str === '-skip') {
                            unhandledOptions.delete(i)
                            if (
                                i + 1 >= ${r.getLength}(m) 
                                || !${r.isFloatToken}(m, i + 1)
                            ) {
                                console.log("invalid value for -skip")
                            }
                            operation.skip = ${r.readFloatToken}(m, i + 1)
                            unhandledOptions.delete(i + 1)
                            i++

                        } else if (str === '-normalize') {
                            unhandledOptions.delete(i)
                            console.log('-normalize not implemented')
                        }
                    }
                    i++
                }

                i = 1
                ${s("boolean","urlFound","false")}
                while (i < ${r.getLength}(m)) {
                    if (!unhandledOptions.has(i)) {

                    } else if (${r.isStringToken}(m, i)) {
                        str = ${r.readStringToken}(m, i)
                        if (!str.startsWith('-') && urlFound === false) {
                            operation.url = str
                            urlFound = true
                        } else {
                            operation.arrayNames.push(str)
                        }
                        unhandledOptions.delete(i)
                    }
                    i++
                }

                for (i = 0; i < operation.arrayNames.length; i++) {
                    if (!${i.hasArray}(operation.arrayNames[i])) {
                        console.log('[soundfiler] unknown array ' + operation.arrayNames[i])
                        return
                    }
                }

                if (unhandledOptions.size) {
                    console.log("soundfiler received invalid options")
                }

                soundInfo.channelCount = operation.arrayNames.length

                if (operationType === 'read') {
                    ${h(a.OperationId,"id",c`${a.readSoundFile}(
                        operation.url, 
                        soundInfo,
                        ${f([s(a.OperationId,"id"),s(a.OperationStatus,"status"),s("FloatArray[]","sound")],"void")`
                            ${h(e.Operation,"operation",`${t}.operations.get(id)`)}
                            ${t}.operations.delete(id)
                            ${s("Int","i","0")}
                            ${s("Float","maxFramesRead","0")}
                            ${s("Float","framesToRead","0")}
                            ${s("FloatArray","array","createFloatArray(0)")}
                            for (i = 0; i < sound.length; i++) {
                                if (operation.resize) {
                                    if (operation.maxSize > 0) {
                                        framesToRead = Math.min(
                                            operation.maxSize, 
                                            toFloat(sound[i].length) - operation.skip
                                        )
        
                                    } else {
                                        framesToRead = toFloat(sound[i].length) - operation.skip
                                    }
        
                                    ${i.setArray}(
                                        operation.arrayNames[i], 
                                        sound[i].subarray(
                                            toInt(operation.skip), 
                                            toInt(operation.skip + framesToRead)
                                        )
                                    )
                                    
                                } else {
                                    array = ${i.getArray}(operation.arrayNames[i])
                                    framesToRead = Math.min(
                                        toFloat(array.length),
                                        toFloat(sound[i].length) - operation.skip
                                    )
                                    array.set(sound[i].subarray(0, array.length))
                                }
                                maxFramesRead = Math.max(
                                    maxFramesRead,
                                    framesToRead
                                )
                            }
        
                            ${n.$1}(${e.buildMessage1}(operation.soundInfo))
                            ${n.$0}(${r.floats}([maxFramesRead]))
                        `}
                    )`)}

                    ${t}.operations.set(id, operation)

                } else if (operationType === 'write') {
                    ${s("Int","i","0")}
                    ${s("Float","framesToWrite","0")}
                    ${s("FloatArray","array","createFloatArray(0)")}
                    ${h("FloatArray[]","sound","[]")}
                    
                    for (i = 0; i < operation.arrayNames.length; i++) {
                        framesToWrite = Math.max(
                            framesToWrite,
                            toFloat(${i.getArray}(operation.arrayNames[i]).length) - operation.skip,
                        )
                    }

                    if (operation.maxSize >= 0) {
                        framesToWrite = Math.min(
                            operation.maxSize, 
                            framesToWrite
                        )
                    }
                    operation.framesToWrite = framesToWrite

                    if (framesToWrite < 1) {
                        console.log('[soundfiler] no frames to write')
                        return
                    }

                    for (i = 0; i < operation.arrayNames.length; i++) {
                        array = ${i.getArray}(operation.arrayNames[i])
                        if (framesToWrite > toFloat(array.length) - operation.skip) {
                            sound.push(createFloatArray(toInt(framesToWrite)))
                            sound[i].set(array.subarray(
                                toInt(operation.skip), 
                                toInt(operation.skip + framesToWrite)
                            ))
                        } else {
                            sound.push(array.subarray(
                                toInt(operation.skip), 
                                toInt(operation.skip + framesToWrite)
                            ))
                        }
                    }

                    ${u("callback",[s(a.OperationId,"id"),s(a.OperationStatus,"status")],"void")`
                        ${h(e.Operation,"operation",`${t}.operations.get(id)`)}
                        ${t}.operations.delete(id)
                        ${n.$1}(${e.buildMessage1}(operation.soundInfo))
                        ${n.$0}(${r.floats}([operation.framesToWrite]))
                    `}

                    ${h(a.OperationId,"id",`${a.writeSoundFile}(
                        sound, 
                        operation.url, 
                        soundInfo, 
                        callback
                    )`)}

                    ${t}.operations.set(id, operation)
                }

                return
            }
        `}),core:({ns:e},{msg:t,fs:n})=>g([y(e.Operation,[s("string","url"),s("Array<string>","arrayNames"),s("boolean","resize"),s("Float","maxSize"),s("Float","framesToWrite"),s("Float","skip"),s(n.SoundInfo,"soundInfo")]),u(e.buildMessage1,[s(n.SoundInfo,"soundInfo")],t.Message)`
                ${h(t.Message,"m",`${t.create}([
                    ${t.FLOAT_TOKEN},
                    ${t.FLOAT_TOKEN},
                    ${t.FLOAT_TOKEN},
                    ${t.FLOAT_TOKEN},
                    ${t.STRING_TOKEN},
                    soundInfo.endianness.length,
                ])`)}
                ${t.writeFloatToken}(m, 0, toFloat(soundInfo.sampleRate))
                ${t.writeFloatToken}(m, 1, -1) // TODO IMPLEMENT headersize
                ${t.writeFloatToken}(m, 2, toFloat(soundInfo.channelCount))
                ${t.writeFloatToken}(m, 3, Math.round(toFloat(soundInfo.bitDepth) / 8))
                ${t.writeStringToken}(m, 4, soundInfo.endianness)
                return m
            `]),dependencies:[He,W,No,Fo]};var Bs={translateArgs:e=>{let t="print:";return e.args.length===1&&e.args[0]==="-n"?t="":e.args.length>=1&&(t=e.args.join(" ")+":"),{prefix:t}},build:()=>({inlets:{0:{type:"message",id:"0"}},outlets:{}})},Ws={messageReceivers:({node:{args:e}},{msg:t})=>({0:f([s(t.Message,"m")])`
            console.log("${e.prefix} " + ${t.display}(m))
            return
        `})};var Kd=["float","bang","symbol","list","anything"],_e=e=>{switch(e){case"f":return"float";case"b":return"bang";case"s":return"symbol";case"l":return"list";case"a":return"anything";case"p":return"pointer";default:return e}},Je=e=>{if(e==="pointer")throw new ke('"pointer" not supported (yet)');if(!Kd.includes(e))throw new ke(`invalid type ${e}`);return e},ct=(e,t,n,{msg:r,bangUtils:a,tokenConversion:o})=>{switch(e){case"float":return`${r.floats}([${o.toFloat}(${t}, ${n})])`;case"bang":return`${a.bang}()`;case"symbol":return`${r.strings}([${o.toString_}(${t}, ${n})])`;case"list":case"anything":return`${t}`;default:throw new Error(`type argument ${e} not supported (yet)`)}},Vs="tokenConversion",Ae={namespace:Vs,code:({ns:e},{msg:t})=>u(e.toFloat,[s(t.Message,"m"),s("Int","i")],"Float")`
        if (${t.isFloatToken}(m, i)) {
            return ${t.readFloatToken}(m, i)
        } else {
            return 0
        }
    `},Me={namespace:Vs,code:({ns:e},{msg:t})=>u(e.toString_,[s(t.Message,"m"),s("Int","i")],"string")`
        if (${t.isStringToken}(m, i)) {
            ${h("string","str",`${t.readStringToken}(m, i)`)}
            if (str === 'bang') {
                return 'symbol'
            } else {
                return str
            }
        } else {
            return 'float'
        }
    `};var zs={translateArgs:({args:e})=>({typeArguments:e.length===0?["bang","bang"]:e.map(Tn).map(_e).map(Je)}),build:({typeArguments:e})=>({inlets:{0:{type:"message",id:"0"}},outlets:A(e,(t,n)=>[`${n}`,{type:"message",id:`${n}`}])})},Gs={messageReceivers:({snds:e,node:{args:{typeArguments:t}}},n)=>({0:f([s(n.msg.Message,"m")])`
            ${t.reverse().map((r,a)=>`${e[t.length-a-1]}(${ct(r,"m",0,n)})`)}
            return
        `}),dependencies:[Ae,Me,T]};var js={translateArgs:({args:e})=>({initValue:I(e[0])||0}),build:()=>({inlets:{0:{type:"message",id:"0"}},outlets:{0:{type:"message",id:"0"}}})},Ks={state:({node:{args:e},ns:t})=>y(t.State,[s("Float","currentValue",e.initValue)]),messageReceivers:({snds:e,state:t},{bangUtils:n,msg:r})=>({0:f([s(r.Message,"m")])`
            if (${r.isMatching}(m, [${r.FLOAT_TOKEN}])) {
                ${h("Float","newValue",`${r.readFloatToken}(m, 0)`)}
                if (newValue !== ${t}.currentValue) {
                    ${t}.currentValue = newValue
                    ${e[0]}(${r.floats}([${t}.currentValue]))
                }
                return
    
            } else if (${n.isBang}(m)) {
                ${e[0]}(${r.floats}([${t}.currentValue]))
                return 
    
            } else if (
                ${r.isMatching}(m, [${r.STRING_TOKEN}, ${r.FLOAT_TOKEN}])
                && ${r.readStringToken}(m, 0) === 'set'
            ) {
                ${t}.currentValue = ${r.readFloatToken}(m, 1)
                return
            }
        `}),dependencies:[T]};var qs={translateArgs:({args:e})=>({threshold:I(e[0])||0}),build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}},outlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}}})},Hs={state:({node:{args:e},ns:t})=>y(t.State,[s("Float","threshold",e.threshold)]),messageReceivers:({snds:e,state:t},{msg:n})=>({0:f([s(n.Message,"m")])`
            if (${n.isMatching}(m, [${n.FLOAT_TOKEN}])) {
                ${h("Float","value",`${n.readFloatToken}(m, 0)`)}
                if (value >= ${t}.threshold) {
                    ${e[1]}(${n.floats}([value]))
                } else {
                    ${e[0]}(${n.floats}([value]))
                }
                return
            }
        `,1:se(`${t}.threshold`,n)})};var Ys={translateArgs:({args:e})=>({minValue:I(e[0])||0,maxValue:I(e[1])||0}),build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"},2:{type:"message",id:"2"}},outlets:{0:{type:"message",id:"0"}}})},Xs={state:({node:{args:e},ns:t})=>y(t.State,[s("Float","minValue",e.minValue),s("Float","maxValue",e.maxValue)]),messageReceivers:({snds:e,state:t},{msg:n})=>({0:f([s(n.Message,"m")])`
            if (${n.isMatching}(m, [${n.FLOAT_TOKEN}])) {
                ${e[0]}(${n.floats}([
                    Math.max(
                        Math.min(
                            ${t}.maxValue, 
                            ${n.readFloatToken}(m, 0)
                        ), 
                        ${t}.minValue
                    )
                ]))
                return
            }
        `,1:se(`${t}.minValue`,n),2:se(`${t}.maxValue`,n)})};var Js={translateArgs:({args:e})=>({filters:e.length?e:[0]}),build:e=>{let t={0:{type:"message",id:"0"}};return e.filters.length===1&&(t[1]={type:"message",id:"1"}),{inlets:t,outlets:A(e.filters.length?L(e.filters.length+1):[0,1],(n,r)=>[`${r}`,{type:"message",id:`${r}`}])}}},Qs={state:({node:{args:e},ns:t},{msg:n})=>y(t.State,[s("Float","floatFilter",typeof e.filters[0]=="number"?e.filters[0]:0),s("string","stringFilter",`"${e.filters[0]}"`),s("Int","filterType",typeof e.filters[0]=="number"?n.FLOAT_TOKEN:n.STRING_TOKEN)]),messageReceivers:({snds:e,state:t,node:{args:n}},{msg:r,bangUtils:a,msgUtils:o})=>n.filters.length>1?{0:f([s(r.Message,"m")])`
                    ${n.filters.map((i,l)=>$t([i==="float",`
                            if (${r.isFloatToken}(m, 0)) {
                                ${e[l]}(m)
                                return
                            }
                        `],[i==="symbol",`
                            if (${r.isStringToken}(m, 0)) {
                                ${e[l]}(m)
                                return
                            }
                        `],[i==="list",`
                            if (${r.getLength}(m).length > 1) {
                                ${e[l]}(m)
                                return
                            }
                        `],[i==="bang",`
                            if (${a.isBang}(m)) {
                                ${e[l]}(m)
                                return
                            }
                        `],[typeof i=="number",`
                            if (
                                ${r.isFloatToken}(m, 0)
                                && ${r.readFloatToken}(m, 0) === ${i}
                            ) {
                                ${e[l]}(${a.emptyToBang}(${o.shift}(m)))
                                return
                            }
                        `],[typeof i=="string",`
                            if (
                                ${r.isStringToken}(m, 0) 
                                && ${r.readStringToken}(m, 0) === "${i}"
                            ) {
                                ${e[l]}(${a.emptyToBang}(${o.shift}(m)))
                                return
                            }`]))}
    
                    ${e[n.filters.length]}(m)
                    return
                `}:{0:f([s(r.Message,"m")])`
                    if (${t}.filterType === ${r.STRING_TOKEN}) {
                        if (
                            (${t}.stringFilter === 'float'
                                && ${r.isFloatToken}(m, 0))
                            || (${t}.stringFilter === 'symbol'
                                && ${r.isStringToken}(m, 0))
                            || (${t}.stringFilter === 'list'
                                && ${r.getLength}(m) > 1)
                            || (${t}.stringFilter === 'bang' 
                                && ${a.isBang}(m))
                        ) {
                            ${e.$0}(m)
                            return
                        
                        } else if (
                            ${r.isStringToken}(m, 0)
                            && ${r.readStringToken}(m, 0) === ${t}.stringFilter
                        ) {
                            ${e.$0}(${a.emptyToBang}(${o.shift}(m)))
                            return
                        }
    
                    } else if (
                        ${r.isFloatToken}(m, 0)
                        && ${r.readFloatToken}(m, 0) === ${t}.floatFilter
                    ) {
                        ${e.$0}(${a.emptyToBang}(${o.shift}(m)))
                        return
                    }
                
                    ${e.$1}(m)
                return
                `,1:f([s(r.Message,"m")])`
                    ${t}.filterType = ${r.getTokenType}(m, 0)
                    if (${t}.filterType === ${r.STRING_TOKEN}) {
                        ${t}.stringFilter = ${r.readStringToken}(m, 0)
                    } else {
                        ${t}.floatFilter = ${r.readFloatToken}(m, 0)
                    }
                    return
                `},dependencies:[T,ze]};var Zs={translateArgs:({args:e})=>({isClosed:(I(e[0])||0)===0}),build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}},outlets:{0:{type:"message",id:"0"}}})},ei={state:({node:{args:e},ns:t})=>y(t.State,[s("Float","isClosed",e.isClosed?"true":"false")]),messageReceivers:({ns:e,snds:t,state:n},{msg:r})=>({0:f([s(r.Message,"m")])`
            if (!${n}.isClosed) {
                ${t.$0}(m)
            }
            return
        `,1:F(e.setIsClosed,n,r)}),core:({ns:e})=>g([u(e.setIsClosed,[s(e.State,"state"),s("Float","value")],"void")`
                state.isClosed = (value === 0)
            `])};var ti={translateArgs:()=>({}),build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}},outlets:{0:{type:"message",id:"0"}}})},ni={state:({ns:e})=>y(e.State,[s("boolean","continueIter","true")]),messageReceivers:({snds:e,state:t},{msg:n,bangUtils:r})=>({0:f([s(n.Message,"m")])`
            if (${r.isBang}(m)) {
                ${t}.continueIter = true
                while (${t}.continueIter) {
                    ${e[0]}(${r.bang}())
                }
                return
    
            } else if (${n.isMatching}(m, [${n.FLOAT_TOKEN}])) {
                ${t}.continueIter = true
                ${s("Int","maxIterCount",`toInt(${n.readFloatToken}(m, 0))`)}
                ${s("Int","iterCount","0")}
                while (${t}.continueIter && iterCount++ < maxIterCount) {
                    ${e[0]}(${r.bang}())
                }
                return
            }
        `,1:f([s(n.Message,"m")])`
            if (${r.isBang}(m)) {
                ${t}.continueIter = false
                return
            }
        `}),dependencies:[T]};var ri={translateArgs:({args:e})=>({maxValue:I(e[0])||0}),build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}},outlets:{0:{type:"message",id:"0"}}})},ai={state:({node:{args:e},ns:t})=>y(t.State,[s("Float","maxValue",e.maxValue)]),messageReceivers:({ns:e,snds:t,state:n},{bangUtils:r,msg:a})=>({0:f([s(a.Message,"m")])`
            if (${r.isBang}(m)) {
                ${t[0]}(${a.floats}([Math.floor(Math.random() * ${n}.maxValue)]))
                return
            } else if (
                ${a.isMatching}(m, [${a.STRING_TOKEN}, ${a.FLOAT_TOKEN}])
                && ${a.readStringToken}(m, 0) === 'seed'
            ) {
                console.log('WARNING : seed not implemented yet for [random]')
                return
            }
        `,1:F(e.setMaxValue,n,a)}),core:({ns:e})=>g([u(e.setMaxValue,[s(e.State,"state"),s("Float","maxValue")],"void")`
                state.maxValue = Math.max(maxValue, 0)
            `]),dependencies:[T]};var oi={translateArgs:({args:e})=>{let t=0;return e.length>=1&&(t=G(e[e.length-1]),e=e.slice(0,-1)),e=e.length?e:[0],{typeArguments:e.map(_e).map(n=>[typeof n=="number"?"float":Je(n),typeof n=="number"?n:n==="float"?0:"symbol"]),delay:t}},build:e=>({inlets:{...A(e.typeArguments,(t,n)=>[`${n}`,{type:"message",id:`${n}`}]),[`${e.typeArguments.length}`]:{type:"message",id:`${e.typeArguments.length}`}},outlets:A(e.typeArguments,(t,n)=>[`${n}`,{type:"message",id:`${n}`}])})},si={state:({node:{args:e},ns:t},{msg:n})=>y(t.State,[s("Int","delay",0),s(`Array<${n.Message}>`,"outputMessages",`[${e.typeArguments.map(([r,a])=>typeof a=="number"?`${n.floats}([${a}])`:`${n.strings}(["${a}"])`).join(",")}]`),s(`Array<${t.ScheduledMessage}>`,"scheduledMessages","[]"),s(`Array<${n.Handler}>`,"snds","[]")]),initialization:({ns:e,node:{args:t},state:n,snds:r})=>c`
            ${e.setDelay}(${n}, ${t.delay})
            ${n}.snds = [${L(t.typeArguments.length).reverse().map(a=>r[a]).join(", ")}]
        `,messageReceivers:({ns:e,node:{args:t},state:n},r)=>{let{bangUtils:a,actionUtils:o,msg:i,core:l}=r;return{0:f([s(i.Message,"m")])`
                if (${o.isAction}(m, 'clear')) {
                    ${e.clear}(${n})
                    return 
        
                } else if (${o.isAction}(m, 'flush')) {
                    if (${n}.scheduledMessages.length) {
                        ${e.sendMessages}(
                            ${n}, 
                            ${n}.scheduledMessages[${n}.scheduledMessages.length - 1].frame
                        )
                    }
                    return
        
                } else {
                    ${h(i.Message,"inMessage",`${a.isBang}(m) ? ${i.create}([]): m`)}
                    ${h("Int","insertIndex",`${e.prepareMessageScheduling}(
                        ${n}, 
                        () => {
                            ${e.sendMessages}(${n}, ${l.FRAME})
                        },
                    )`)}
        
                    ${t.typeArguments.slice(0).reverse().map(([d],p)=>[t.typeArguments.length-p-1,d]).map(([d,p],m)=>c`
                                if (${i.getLength}(inMessage) > ${d}) {
                                    ${n}.scheduledMessages[insertIndex + ${m}].message = 
                                        ${ct(p,"inMessage",d,r)}
                                    ${n}.outputMessages[${d}] 
                                        = ${n}.scheduledMessages[insertIndex + ${m}].message
                                } else {
                                    ${n}.scheduledMessages[insertIndex + ${m}].message 
                                        = ${n}.outputMessages[${d}]
                                }
                            `)}
        
                    return
                }
            `,...A(t.typeArguments.slice(1),([d],p)=>[`${p+1}`,f([s(i.Message,"m")])`
                        ${n}.outputMessages[${p+1}] = ${ct(d,"m",0,r)}
                        return
                    `]),[t.typeArguments.length]:F(e.setDelay,n,i)}},core:({ns:e},{msg:t,sked:n,core:r,commons:a})=>g([y(e.ScheduledMessage,[s(t.Message,"message"),s("Int","frame"),s(n.Id,"skedId")]),h(e.ScheduledMessage,e.dummyScheduledMessage,`{
                message: ${t.create}([]),
                frame: 0,
                skedId: ${n.ID_NULL},
            }`),u(e.prepareMessageScheduling,[s(e.State,"state"),s(n.Callback,"callback")],"Int")`
                ${s("Int","insertIndex","0")}
                ${s("Int","frame",`${r.FRAME} + state.delay`)}
                ${s(n.Id,"skedId",n.ID_NULL)}
        
                while (
                    insertIndex < state.scheduledMessages.length 
                    && state.scheduledMessages[insertIndex].frame <= frame
                ) {
                    insertIndex++
                }
        
                ${""}
                if (
                    insertIndex === 0 || 
                    (
                        insertIndex > 0 
                        && state.scheduledMessages[insertIndex - 1].frame !== frame
                    )
                ) {
                    skedId = ${a.waitFrame}(frame, callback)
                }
        
                ${""}
                for (${s("Int","i",0)}; i < state.snds.length; i++) {
                    state.scheduledMessages.push(${e.dummyScheduledMessage})
                }
                state.scheduledMessages.copyWithin(
                    (insertIndex + 1) * state.snds.length, 
                    insertIndex * state.snds.length
                )
                for (${s("Int","i",0)}; i < state.snds.length; i++) {
                    state.scheduledMessages[insertIndex + i] = {
                        message: ${e.dummyScheduledMessage}.message,
                        frame,
                        skedId,
                    }
                }
        
                return insertIndex
            `,u(e.sendMessages,[s(e.State,"state"),s("Int","toFrame")],"void")`
                ${s("Int","i",0)}
                while (
                    state.scheduledMessages.length 
                    && state.scheduledMessages[0].frame <= toFrame
                ) {
                    for (i = 0; i < state.snds.length; i++) {
                        // Snds are already reversed
                        state.snds[i](state.scheduledMessages.shift().message)
                    }
                }
            `,u(e.clear,[s(e.State,"state")],"void")`
                ${s("Int","i","0")}
                ${h("Int","length","state.scheduledMessages.length")}
                for (i; i < length; i++) {
                    ${a.cancelWaitFrame}(state.scheduledMessages[i].skedId)
                }
                state.scheduledMessages = []
            `,u(e.setDelay,[s(e.State,"state"),s("Float","delay")],"void")`
                state.delay = toInt(Math.round(delay / 1000 * ${r.SAMPLE_RATE}))
            `]),dependencies:[Ae,Me,T,O,V]};var ii={translateArgs:({args:e})=>({typeArguments:(e.length?e:["float","float"]).map(_e).map(t=>{if(t=t||"float",t==="bang"&&(t="float"),typeof t=="number")return t;if(!["float","symbol"].includes(t))throw new Error(`${t} not supported (yet)`);return t}).map(t=>[typeof t=="number"?"float":Je(t),typeof t=="number"?t:t==="float"?0:"symbol"])}),build:({typeArguments:e})=>({inlets:A(e,(t,n)=>[`${n}`,{type:"message",id:`${n}`}]),outlets:{0:{type:"message",id:"0"}}})},li={state:({node:{args:e},ns:t})=>y(t.State,[s("Array<Float>","floatValues",`[${e.typeArguments.map(([n,r])=>n==="float"?r:0).join(",")}]`),s("Array<string>","stringValues",`[${e.typeArguments.map(([n,r])=>n==="symbol"?`"${r}"`:'""').join(",")}]`)]),messageReceivers:({snds:e,state:t,node:n},{bangUtils:r,tokenConversion:a,msg:o})=>({0:f([s(o.Message,"m")])`
            if (!${r.isBang}(m)) {
                for (${s("Int","i","0")}; i < ${o.getLength}(m); i++) {
                    ${t}.stringValues[i] = ${a.toString_}(m, i)
                    ${t}.floatValues[i] = ${a.toFloat}(m, i)
                }
            }
    
            ${h(o.Template,"template",`[${n.args.typeArguments.map(([i],l)=>i==="symbol"?`${o.STRING_TOKEN}, ${t}.stringValues[${l}].length`:`${o.FLOAT_TOKEN}`).join(",")}]`)}
    
            ${h(o.Message,"messageOut",`${o.create}(template)`)}
    
            ${n.args.typeArguments.map(([i],l)=>i==="symbol"?`${o.writeStringToken}(messageOut, ${l}, ${t}.stringValues[${l}])`:`${o.writeFloatToken}(messageOut, ${l}, ${t}.floatValues[${l}])`)}
    
            ${e[0]}(messageOut)
            return
        `,...A(n.args.typeArguments.slice(1),([i],l)=>{if(i==="symbol")return[`${l+1}`,f([s(o.Message,"m")])`
                        ${t}.stringValues[${l+1}] = ${a.toString_}(m, 0)
                        return
                    `];if(i==="float")return[`${l+1}`,f([s(o.Message,"m")])`
                        ${t}.floatValues[${l+1}] = ${a.toFloat}(m, 0)
                        return
                    `];throw new Error(`Unsupported type argument ${i}`)})}),dependencies:[Me,Ae,T]};var di={translateArgs:({args:e})=>({typeArguments:e.length===0?["float","float"]:e.map(_e).map(t=>{if(typeof t=="number")return"float";if(t==="symbol"||t==="float")return t;throw new Error(`Invalid type argument for unpack "${t}"`)})}),build:({typeArguments:e})=>({inlets:{0:{type:"message",id:"0"}},outlets:A(e,(t,n)=>[`${n}`,{type:"message",id:`${n}`}])})},ui={messageReceivers:({snds:e,node:{args:t}},{msg:n})=>({0:f([s(n.Message,"m")])`
            ${t.typeArguments.map((r,a)=>[r,a]).reverse().map(([r,a])=>`
                    if (
                        ${n.getLength}(m) >= ${a+1}
                    ) {
                        if (${n.getTokenType}(m, ${a}) === ${r==="float"?n.FLOAT_TOKEN:n.STRING_TOKEN}) {
                            ${$t([r==="float",`${e[a]}(${n.floats}([${n.readFloatToken}(m, ${a})]))`],[r==="symbol",`${e[a]}(${n.strings}([${n.readStringToken}(m, ${a})]))`])}
                        } else {
                            console.log('unpack : invalid token type index ${a}')
                        }
                    }
                `)}
            return
        `})};var qd={translateArgs:({args:e})=>({tokenizedExpressions:hi(e).map(ar)}),build:e=>({inlets:A(nr(e.tokenizedExpressions),({id:t})=>[`${t}`,{type:"message",id:`${t}`}]),outlets:A(e.tokenizedExpressions,(t,n)=>[`${n}`,{type:"message",id:`${n}`}])})},Hd={translateArgs:({args:e})=>({tokenizedExpressions:hi(e).map(ar)}),build:e=>({inlets:A(rr(e.tokenizedExpressions),({id:t,type:n})=>[`${t}`,{type:n==="signal"?"signal":"message",id:`${t}`}]),outlets:A(e.tokenizedExpressions,(t,n)=>[`${n}`,{type:"signal",id:`${n}`}])})},pi=()=>({state:({node:{args:e},ns:t})=>y(t.State,[s("Map<Int, Float>","floatInputs","new Map()"),s("Map<Int, string>","stringInputs","new Map()"),s("Array<Float>","outputs",`new Array(${e.tokenizedExpressions.length})`)]),initialization:({node:{args:e,type:t},state:n})=>{let r=t==="expr"?nr(e.tokenizedExpressions):rr(e.tokenizedExpressions).filter(({type:a})=>a!=="signal");return c`
            ${r.filter(a=>a.type==="float"||a.type==="int").map(a=>`${n}.floatInputs.set(${a.id}, 0)`)}
            ${r.filter(a=>a.type==="string").map(a=>`${n}.stringInputs.set(${a.id}, '')`)}
        `},messageReceivers:({snds:e,state:t,node:{args:n,type:r}},a)=>{let{bangUtils:o,tokenConversion:i,msg:l}=a,d=r==="expr"?nr(n.tokenizedExpressions):rr(n.tokenizedExpressions).filter(({type:m})=>m!=="signal"),p=d.length&&d[0].id===0;return{0:f([s(l.Message,"m")])`
                if (!${o.isBang}(m)) {
                    for (${s("Int","i","0")}; i < ${l.getLength}(m); i++) {
                        ${t}.stringInputs.set(i, ${i.toString_}(m, i))
                        ${t}.floatInputs.set(i, ${i.toFloat}(m, i))
                    }
                }
    
                ${r==="expr"?`
                    ${n.tokenizedExpressions.map((m,$)=>`${t}.outputs[${$}] = ${ci(t,null,m,a)}`)}
            
                    ${n.tokenizedExpressions.map((m,$)=>`${e[`${$}`]}(${l.floats}([${t}.outputs[${$}]]))`)}
                `:null}
                
                return
            `,...A(d.slice(p?1:0),({id:m,type:$})=>{if($==="float"||$==="int")return[`${m}`,f([s(l.Message,"m")])`
                                ${t}.floatInputs.set(${m}, ${i.toFloat}(m, 0))
                                return
                            `];if($==="string")return[`${m}`,f([s(l.Message,"m")])`
                                ${t}.stringInputs.set(${m}, ${i.toString_}(m, 0))
                                return
                            `];throw new Error(`invalid input type ${$}`)})}},dependencies:[Me,Ae,Zt,T,W]}),Yd=pi(),Xd={...pi(),flags:{alphaName:"expr_t"},dsp:({node:{args:e},state:t,outs:n,ins:r},a)=>g(e.tokenizedExpressions.map((o,i)=>`${n[i]} = ${ci(t,r,o,a)}`))},Jd=/(?<f>\$f(?<id_f>[0-9]+))|(?<v>\$v(?<id_v>[0-9]+))|(?<i>\$i(?<id_i>[0-9]+))|(?<s>\$s(?<id_s>[0-9]+)\s*\[(?<sIndex>[^\[\]]*)\])/,ar=e=>{let t,n=[];for(;t=Jd.exec(e);)t.index&&n.push({type:"raw",content:e.slice(0,t.index)}),t[1]?n.push({type:"float",id:parseInt(t[2])-1}):t[3]?n.push({type:"signal",id:parseInt(t[4])-1}):t[5]?n.push({type:"int",id:parseInt(t[6])-1}):t[7]&&(n=[...n,{type:"string",id:parseInt(t[8])-1},{type:"indexing-start"},...ar(t[9]),{type:"indexing-end"}]),e=e.slice(t.index+t[0].length);return e.length&&n.push({type:"raw",content:e}),n},ci=(e,t,n,{numbers:r,commons:a})=>"+("+n.map(o=>{switch(o.type){case"float":return`${e}.floatInputs.get(${o.id})`;case"signal":if(t===null)throw new Error("invalid token signal received");return t[o.id];case"int":return`${r.roundFloatAsPdInt}(${e}.floatInputs.get(${o.id}))`;case"string":return`${a.getArray}(${e}.stringInputs.get(${o.id}))`;case"indexing-start":return"[toInt(";case"indexing-end":return")]";case"raw":return o.content}}).join("")+")",mi=e=>{let t=[];e.forEach(r=>{r.forEach(a=>{(a.type==="float"||a.type==="signal"||a.type==="int"||a.type==="string")&&t.push(a)})}),t.sort(({id:r},{id:a})=>r-a);let n=new Map;return t.filter(r=>{if(n.has(r.id)){if(n.get(r.id).type!==r.type)throw new Error(`contradictory definitions for input ${r.id}`);return!1}else return n.set(r.id,r),!0})},nr=e=>{let t=mi(e);return t.forEach(n=>{if(n.type==="signal")throw new Error("invalid signal token $v# for [expr]")}),t},rr=e=>mi(e),hi=e=>{let t=e.join(" ");return Object.getOwnPropertyNames(Math).forEach(n=>{t=t.replaceAll(n,`Math.${n}`)}),t.split(";").map(n=>n.trim())},fi={expr:Yd,"expr~":Xd},gi={expr:qd,"expr~":Hd};var R=e=>({translateArgs:t=>{let n=I(t.args[0]);return{value:n!==void 0?n:e}},build:()=>({inlets:{0:{type:"message",id:"0"},1:{type:"message",id:"1"}},outlets:{0:{type:"message",id:"0"}}})}),P=({operationName:e,generateOperation:t,dependencies:n=[],prepareLeftOp:r,prepareRightOp:a})=>({flags:{alphaName:e},state:({ns:o})=>y(o.State,[s("Float","leftOp",0),s("Float","rightOp",0)]),initialization:({ns:o,state:i,node:{args:l}})=>c`
            ${o.setLeft}(${i}, 0)
            ${o.setRight}(${i}, ${l.value})
        `,messageReceivers:({ns:o,state:i,snds:l},d)=>{let{bangUtils:p,msg:m}=d;return{0:f([s(m.Message,"m")])`
                    if (${m.isMatching}(m, [${m.FLOAT_TOKEN}])) {
                        ${o.setLeft}(${i}, ${m.readFloatToken}(m, 0))
                        ${l.$0}(${m.floats}([${t(i,d)}]))
                        return
                    
                    } else if (${p.isBang}(m)) {
                        ${l.$0}(${m.floats}([${t(i,d)}]))
                        return
                    }
                `,1:F(o.setRight,i,m)}},core:({ns:o})=>g([u(o.setLeft,[s(o.State,"state"),s("Float","value")],"void")`
                    state.leftOp = ${r||"value"}
                `,u(o.setRight,[s(o.State,"state"),s("Float","value")],"void")`
                    state.rightOp = ${a||"value"}
                `]),dependencies:[T,...n]}),yi={"+":P({operationName:"add",generateOperation:e=>`${e}.leftOp + ${e}.rightOp`}),"-":P({operationName:"sub",generateOperation:e=>`${e}.leftOp - ${e}.rightOp`}),"*":P({operationName:"mul",generateOperation:e=>`${e}.leftOp * ${e}.rightOp`}),"/":P({operationName:"div",generateOperation:e=>`${e}.rightOp !== 0 ? ${e}.leftOp / ${e}.rightOp: 0`}),max:P({operationName:"max",generateOperation:e=>`Math.max(${e}.leftOp, ${e}.rightOp)`}),min:P({operationName:"min",generateOperation:e=>`Math.min(${e}.leftOp, ${e}.rightOp)`}),mod:P({operationName:"mod",prepareLeftOp:"value > 0 ? Math.floor(value): Math.ceil(value)",prepareRightOp:"Math.floor(Math.abs(value))",generateOperation:e=>`${e}.rightOp !== 0 ? (${e}.rightOp + (${e}.leftOp % ${e}.rightOp)) % ${e}.rightOp: 0`}),"%":P({operationName:"modlegacy",generateOperation:e=>`${e}.leftOp % ${e}.rightOp`}),pow:P({operationName:"pow",generateOperation:(e,{funcs:t})=>`${t.pow}(${e}.leftOp, ${e}.rightOp)`,dependencies:[Kt]}),log:P({operationName:"log",prepareRightOp:"value > 0 ? value : Math.E",generateOperation:(e,{funcs:t})=>`${t.log}(${e}.leftOp, ${e}.rightOp)`,dependencies:[qt]}),atan2:P({operationName:"atan2",generateOperation:e=>`Math.atan2(${e}.leftOp, ${e}.rightOp)`}),"||":P({operationName:"or",prepareLeftOp:"Math.floor(Math.abs(value))",prepareRightOp:"Math.floor(Math.abs(value))",generateOperation:e=>`${e}.leftOp || ${e}.rightOp ? 1: 0`}),"&&":P({operationName:"and",prepareLeftOp:"Math.floor(Math.abs(value))",prepareRightOp:"Math.floor(Math.abs(value))",generateOperation:e=>`${e}.leftOp && ${e}.rightOp ? 1: 0`}),">":P({operationName:"gt",generateOperation:e=>`${e}.leftOp > ${e}.rightOp ? 1: 0`}),">=":P({operationName:"gte",generateOperation:e=>`${e}.leftOp >= ${e}.rightOp ? 1: 0`}),"<":P({operationName:"lt",generateOperation:e=>`${e}.leftOp < ${e}.rightOp ? 1: 0`}),"<=":P({operationName:"lte",generateOperation:e=>`${e}.leftOp <= ${e}.rightOp ? 1: 0`}),"==":P({operationName:"eq",generateOperation:e=>`${e}.leftOp == ${e}.rightOp ? 1: 0`}),"!=":P({operationName:"neq",generateOperation:e=>`${e}.leftOp != ${e}.rightOp ? 1: 0`})},$i={"+":R(0),"-":R(0),"*":R(1),"/":R(1),max:R(0),min:R(1),mod:R(0),"%":R(0),pow:R(0),log:R(Math.E),atan2:R(0),"||":R(0),"&&":R(0),">":R(0),">=":R(0),"<":R(0),"<=":R(0),"==":R(0),"!=":R(0)};var or={...yt,...us,...fo,...Qa,...Ss,...Ts,...fs,...Wo,...tr,...tr,...xo,"noise~":ps,"snapshot~":ro,"sig~":It,"samphold~":to,"clip~":Za,"vline~":so,"line~":lo,"dac~":za,"adc~":ja,"samplerate~":qa,"tabplay~":Ao,"tabwrite~":Io,"readsf~":Lo,"writesf~":Po,"vd~":{aliasTo:"delread4~"},"bp~":Uo,"hip~":_s,"lop~":Ms,"vcf~":Ns,"delwrite~":ys,"s~":{aliasTo:"send~"},"r~":{aliasTo:"receive~"},...Xo,...Zo,...$i,...ls,...os,...gi,bang:Jo,bng:{aliasTo:"bang"},b:{aliasTo:"bang"},list:Os,symbol:Cs,loadbang:ts,s:{aliasTo:"send"},r:{aliasTo:"receive"},print:Bs,trigger:zs,t:{aliasTo:"trigger"},change:js,clip:Ys,pipe:oi,moses:qs,pack:ii,unpack:di,spigot:Zs,until:ti,random:ri,route:Js,select:{aliasTo:"route"},sel:{aliasTo:"route"},msg:vs,metro:zo,timer:jo,delay:qo,del:{aliasTo:"delay"},line:co,soundfiler:Ds,tabread:go,tabwrite:$o,"_mixer~":St,_routemsg:bt,graph:{isNoop:!0},table:{isNoop:!0},array:{isNoop:!0},text:{isNoop:!0},cnv:{isNoop:!0},"block~":{isNoop:!0},openpanel:{isNoop:!0}},sr={...ds,...ho,...Ja,...Is,...xs,...gs,...Vo,...Ps,..._o,"noise~":cs,"snapshot~":ao,"sig~":zr,"samphold~":no,"clip~":eo,"vline~":io,"line~":uo,"dac~":Ga,"adc~":Ka,"samplerate~":Ha,"tabplay~":Mo,"tabwrite~":bo,"readsf~":Co,"writesf~":Do,"delwrite~":$s,"bp~":Bo,"hip~":As,"lop~":ks,"vcf~":Fs,...Yo,...es,...yi,...ss,...is,...fi,bang:Qo,list:Ls,symbol:Rs,loadbang:ns,print:Ws,trigger:Gs,change:Ks,clip:Xs,pipe:si,moses:Hs,pack:li,unpack:ui,spigot:ei,until:ni,route:Qs,random:ai,msg:Es,metro:Go,timer:Ko,delay:Ho,line:mo,tabread:yo,tabwrite:So,soundfiler:Us,"_mixer~":Wr,_routemsg:Gr};var Si=(e,t)=>bi(e,t,"send").reduce((n,r)=>({...n,[r.id]:["0"]}),{}),Ii=(e,t)=>bi(e,t,"receive").reduce((n,r)=>({...n,[r.id]:["0"]}),{}),bi=(e,t,n)=>{let r=ce(e);return Object.values(r.nodes).map(a=>{let o=he(r.id,a.id),i=t[o];return i&&i.type===n?i:null}).filter(a=>a!==null)};var wi=(e,t)=>xi(e,t).reduce((n,r)=>({...n,[r.id]:["0"]}),{}),Ti=(e,t)=>xi(e,t).reduce((n,r)=>({...n,[r.id]:["0"]}),{}),xi=(e,t)=>{let n=xt(e),r=[];return Ne(n,a=>{if(a.nodeClass!=="control")return;let o=t[a.nodeId];o&&r.push(o)}),r};var _i=(e,t,n)=>{let r={pdNodes:{},graph:{},pdGui:[]},a=e.io||{};if(a.messageReceivers||(a.messageReceivers={...wi(n,t),...Si(n,t)}),a.messageSenders||(a.messageSenders={...Ti(n,t),...Ii(n,t)}),Object.keys(a.messageReceivers).forEach(o=>{r.graph[o]=t[o]}),Object.keys(a.messageSenders).forEach(o=>{r.graph[o]=t[o]}),n){let o=xt(n);Ne(o,i=>{if(r.pdNodes[i.patchId]=r.pdNodes[i.patchId]||{},r.pdNodes[i.patchId][i.pdNodeId]=n.patches[i.patchId].nodes[i.pdNodeId],i.nodeClass==="control"){let l=t[i.nodeId];l&&(r.graph[i.nodeId]=l)}}),r.pdGui=o}return{...e,io:a,customMetadata:{...e.customMetadata||{},...r}}};var Qd="@webpd/compiler",Zd="0.2.1",eu="WebPd compiler package",tu="./dist/src/index.js",nu="./dist/src/index.d.ts",ru="module",au=!1,ou="LGPL-3.0",su="S\xE9bastien Piquemal",iu=["dist"],lu={test:"NODE_OPTIONS='--experimental-vm-modules --no-warnings' npx jest --runInBand --config node_modules/@webpd/dev/configs/jest.js","build:dist":"npx rollup --config configs/dist.rollup.mjs","build:bindings":"npx rollup --config configs/bindings.rollup.mjs",build:"npm run clean; npm run build:dist; npm run build:bindings",clean:"rm -rf dist",prettier:"prettier --write --config node_modules/@webpd/dev/configs/prettier.json",postpublish:`git tag -a v$(node -p "require('./package.json').version") -m "Release $(node -p "require('./package.json').version")" ; git push --tags`},du={type:"git",url:"git+https://github.com/sebpiq/WebPd_compiler.git"},uu={url:"https://github.com/sebpiq/WebPd_compiler/issues"},pu="https://github.com/sebpiq/WebPd_compiler#readme",cu={"@webpd/dev":"github:sebpiq/WebPd_dev#v1",assemblyscript:"^0.27.24"},Ai={name:Qd,version:Zd,description:eu,main:tu,types:nu,type:ru,sideEffects:au,license:ou,author:su,private:!1,files:iu,scripts:lu,repository:du,bugs:uu,homepage:pu,devDependencies:cu};var tn=({variableNamesReadOnly:e,precompiledCode:{dependencies:t},settings:{audio:n,io:r,customMetadata:a}})=>{let o={},i=[...t.exports,...t.imports.map(l=>l.name)];return Object.entries(e.globals).forEach(([l,d])=>Object.entries(d||{}).forEach(([p,m])=>{i.includes(m)&&(o[l]||(o[l]={}),o[l][p]=m)})),{libVersion:Ai.version,customMetadata:a,settings:{audio:{...n,sampleRate:0,blockSize:0},io:r},compilation:{variableNamesIndex:{io:e.io,globals:o}}}},Mi=e=>JSON.stringify(e).replace(/\\"/g,'\\\\"');var ne=(e,t)=>t.map(n=>U(e,n)),nn=(e,t,n)=>Ni(t.sinks,me,e,t,n),mu=(e,t,n)=>Ni(t.sources,wt,e,t,n),ir=(e,t)=>ki(e.sinks,me,e,t),ki=(e,t,n,r)=>Object.entries(e).reduce((a,[o,i])=>{let l={portletId:o,nodeId:n.id};return t(n,o).type===r||r===void 0?[...a,...i.map(p=>[l,p])]:a},[]),Ni=(e,t,n,r,a)=>ki(e,t,r,a).reduce((o,[i,l])=>o.includes(l.nodeId)?o:[...o,l.nodeId],[]).map(o=>U(n,o)),Ce=(e,t,n)=>{let r=[];return t.forEach(a=>Fi(r,[],e,a,n)),r},Fi=(e,t,n,r,a)=>{if(a&&!a(r))return;let o=[...t,r.id];mu(n,r,"signal").forEach(i=>{t.indexOf(i.id)===-1&&Fi(e,o,n,i,a)}),e.indexOf(r.id)===-1&&e.push(r.id)},vi=(e,t)=>{let n=[];return t.forEach(r=>{Ei(n,e,r)}),n},Ei=(e,t,n)=>{e.indexOf(n.id)===-1&&(e.push(n.id),nn(t,n,"message").forEach(r=>{Ei(e,t,r)}))},Oi=(e,t)=>A(Object.values(e).filter(n=>t.includes(n.id)),n=>[n.id,{...n,sources:fu(n.sources,t),sinks:hu(n.sinks,t)}]),hu=(e,t)=>{let n={};return Object.entries(e).forEach(([r,a])=>{let o=a.filter(({nodeId:i})=>t.includes(i));o.length&&(n[r]=o)}),n},fu=(e,t)=>{let n={};return Object.entries(e).forEach(([r,a])=>{let o=a.filter(({nodeId:i})=>t.includes(i));o.length&&(n[r]=o)}),n};var gu=(e,t)=>`let ${e.name}${t?` = ${t}`:""}`,yu=(e,t)=>`const ${e.name} = ${t}`,$u=(e,t,n)=>`function ${e.name!==null?e.name:""}(${e.args.map((r,a)=>t[a]?`${r.name}=${t[a]}`:r.name).join(", ")}) {${n}}`,Su=()=>"",rn={Var:gu,ConstVar:yu,Func:$u,Class:Su};var Iu=(e,t)=>`let ${e.name}: ${e.type}${t?` = ${t}`:""}`,bu=(e,t)=>`const ${e.name}: ${e.type} = ${t}`,wu=(e,t,n)=>`function ${e.name!==null?e.name:""}(${e.args.map((r,a)=>`${r.name}: ${r.type}${t[a]?`=${t[a]}`:""}`).join(", ")}): ${e.returnType} {${n}}`,Tu=e=>`class ${e.name} {
${e.members.map(t=>`${t.name}: ${t.type}`).join(`
`)}
}`,an={Var:Iu,ConstVar:bu,Func:wu,Class:Tu};var Li=e=>({javascript:rn,assemblyscript:an})[e],on=(e,t)=>{let n=e[t];if(!n)throw new Error(`node [${t}] is not implemented`);return{dependencies:[],...n}},lr=e=>{let t=Object.values(e).filter(r=>!!r.isPullingSignal),n=Object.values(e).filter(r=>!!r.isPushingMessages);return Array.from(new Set([...vi(e,n),...Ce(e,t)]))},Ci=(e,t)=>Object.values(e).reduce((n,r)=>r.type in n?n:{...n,[r.type]:on(t,r.type)},{}),sn=e=>Ce(e,dr(e)),dr=e=>Object.values(e).filter(t=>!!t.isPullingSignal);var Ri=({graph:e,variableNamesAssigner:t,precompiledCodeAssigner:n},r,a)=>{n.graph.coldDspGroups[a]={functionName:t.coldDspGroups[a],dspGroup:r,sinkConnections:_u(e,r)}},Pi=({graph:e},t,n)=>({traversal:n.reduce((r,a)=>cr(r,a.traversal),sn(e)),outNodesIds:t.outNodesIds}),Di=(e,t)=>xu(e,t).reduce((n,r)=>{let a=n.find(o=>o.traversal.some(i=>r.traversal.includes(i)));return a?[...n.filter(o=>o!==a),{traversal:[...a.traversal,...r.traversal],outNodesIds:[...a.outNodesIds,...r.outNodesIds]}]:[...n,r]},[]).map(n=>({traversal:Ce(e.graph,ne(e.graph,n.outNodesIds)),outNodesIds:n.outNodesIds})),xu=(e,t)=>ne(e.graph,t.traversal).reduce((n,r)=>{if(!ur(e,r)||nn(e.graph,r,"signal").every(i=>ur(e,i)))return n;let a=!0,o={outNodesIds:[r.id],traversal:Ce(e.graph,[r],i=>(a=a&&ur(e,i),a))};return a?[...n,o]:n},[]),Ui=(e,t)=>ne(e.graph,t.traversal).reduce((n,r)=>{let a=nn(e.graph,r,"signal");return pr(e,r)&&!t.outNodesIds.includes(r.id)&&(!pr(e,a[0])||t.outNodesIds.includes(a[0].id))?[...n,{traversal:Ce(e.graph,[r],o=>pr(e,o)),outNodesIds:[r.id]}]:n},[]),Bi=(e,t)=>e.traversal.includes(t),Wi=(e,t)=>Object.values(e).find(({sinkConnections:n})=>n.find(([r,a])=>rt(a,t))),_u=(e,t)=>ne(e,t.outNodesIds).flatMap(n=>ir(n,"signal")),cr=(e,t)=>e.filter(n=>!t.includes(n)),ur=({precompiledCodeAssigner:e},t)=>{let n=e.nodes[t.id],r=e.nodeImplementations[n.nodeType];return r.nodeImplementation.flags?!!r.nodeImplementation.flags.isPureFunction:!1},pr=({precompiledCodeAssigner:e},t)=>{let n=ir(t,"signal").map(([o,i])=>i).reduce((o,i)=>o.every(l=>!rt(l,i))?[...o,i]:o,[]),r=e.nodes[t.id],a=e.nodeImplementations[r.nodeType];return!!a.nodeImplementation.flags&&!!a.nodeImplementation.flags.isDspInline&&n.length===1};var Au=({precompiledCode:e})=>e.dependencies.ast,Mu=({precompiledCode:{nodeImplementations:e}})=>g(Object.values(e).map(t=>[t.stateClass,t.core])),ku=({precompiledCode:{graph:e,nodes:t,nodeImplementations:n}})=>g([e.fullTraversal.reduce((r,a)=>{let o=t[a],i=n[o.nodeType];if(o.state){if(!i.stateClass)throw new Error(`Node "${a}" of type ${o.nodeType} has a state but no state class`);return[...r,h(i.stateClass.name,o.state.name,c`{
                                ${Object.entries(o.state.initialization).map(([l,d])=>c`${l}: ${d},`)}
                            }`)]}else return r},[])]),Nu=({precompiledCode:{graph:e,nodes:t}})=>g([e.fullTraversal.map(n=>t[n].initialization)]),Fu=({globals:{msg:e},precompiledCode:{io:t}})=>g(Object.values(t.messageReceivers).map(n=>Object.values(n).map(r=>u(r.functionName,[s(e.Message,"m")],"void")`
                    ${r.getSinkFunctionName()}(m)
                `))),vu=({precompiledCode:e},t)=>g(Object.entries(e.io.messageSenders).map(([n,r])=>Object.entries(r).map(([a,o])=>t(o.functionName,n,a)))),Eu=({globals:{msg:e},precompiledCode:{graph:t,nodes:n},settings:{debug:r}})=>g([t.fullTraversal.map(a=>[n[a],a]).map(([a,o])=>[Object.values(a.signalOuts).map(i=>s("Float",i,"0")),Object.entries(a.messageReceivers).map(([i,l])=>u(l.name,l.args,l.returnType)`
                            ${l.body}
                            throw new Error('Node "${o}", inlet "${i}", unsupported message : ' + ${e.display}(${l.args[0].name})${r?" + '\\nDEBUG : remember, you must return from message receiver'":""})
                        `)]),t.fullTraversal.flatMap(a=>Object.values(n[a].messageSenders)).filter(({sinkFunctionNames:a})=>a.length>0).map(({messageSenderName:a,sinkFunctionNames:o})=>u(a,[s(e.Message,"m")],"void")`
                        ${o.map(i=>`${i}(m)`)}
                    `)]),Ou=({globals:{core:e,commons:t},precompiledCode:{nodes:n,graph:{hotDspGroup:r,coldDspGroups:a}}})=>c`
        for (${e.IT_FRAME} = 0; ${e.IT_FRAME} < ${e.BLOCK_SIZE}; ${e.IT_FRAME}++) {
            ${t._emitFrame}(${e.FRAME})
            ${r.traversal.map(o=>[...Object.entries(n[o].dsp.inlets).filter(([i])=>Wi(a,{nodeId:o,portletId:i})===void 0).map(([i,l])=>l),n[o].dsp.loop])}
            ${e.FRAME}++
        }
    `,Lu=({globals:{msg:e},precompiledCode:{graph:t}})=>g(Object.values(t.coldDspGroups).map(({functionName:n})=>`${n}(${e.EMPTY_MESSAGE})`)),Cu=({globals:{msg:e},precompiledCode:{graph:{coldDspGroups:t},nodes:n}})=>g(Object.values(t).map(({dspGroup:r,sinkConnections:a,functionName:o})=>u(o,[s(e.Message,"m")],"void")`
                    ${r.traversal.map(i=>n[i].dsp.loop)}
                    ${a.filter(([i,l])=>l.portletId in n[l.nodeId].dsp.inlets).map(([i,l])=>n[l.nodeId].dsp.inlets[l.portletId])}
                `)),Ru=({precompiledCode:{dependencies:e}},t,n)=>g([e.imports.map(t),e.exports.map(n)]),v={dependencies:Au,nodeImplementationsCoreAndStateClasses:Mu,nodeStateInstances:ku,nodeInitializations:Nu,ioMessageReceivers:Fu,ioMessageSenders:vu,portletsDeclarations:Eu,dspLoop:Ou,coldDspInitialization:Lu,coldDspFunctions:Cu,importsExports:Ru};var re=(e,t)=>{if(typeof t=="string")return t;if(t.astType==="Var")return t.value?e.Var(t,re(e,t.value)):e.Var(t);if(t.astType==="ConstVar"){if(!t.value)throw new Error(`ConstVar ${t.name} must have an initial value`);return e.ConstVar(t,re(e,t.value))}else{if(t.astType==="Func")return e.Func(t,t.args.map(n=>n.value?re(e,n.value):null),re(e,t.body));if(t.astType==="Class")return e.Class(t);if(t.astType==="Sequence")return t.content.map(n=>re(e,n)).join("");throw new Error(`Unexpected element in AST ${t}`)}};var Vi=e=>{let{precompiledCode:t,settings:n,variableNamesReadOnly:r}=e,a=Z(r),{globals:o}=a,i={settings:n,globals:o,precompiledCode:t},l=tn(e);return re(rn,c`
        ${v.dependencies(i)}
        ${v.nodeImplementationsCoreAndStateClasses(i)}

        ${v.nodeStateInstances(i)}
        ${v.portletsDeclarations(i)}

        ${v.coldDspFunctions(i)}
        ${v.ioMessageReceivers(i)}
        ${v.ioMessageSenders(i,(d,p,m)=>c`const ${d} = (m) => {exports.io.messageSenders['${p}']['${m}'](m)}`)}

        const exports = {
            metadata: ${JSON.stringify(l)},
            initialize: (sampleRate, blockSize) => {
                exports.metadata.settings.audio.sampleRate = sampleRate
                exports.metadata.settings.audio.blockSize = blockSize
                ${o.core.SAMPLE_RATE} = sampleRate
                ${o.core.BLOCK_SIZE} = blockSize

                ${v.nodeInitializations(i)}
                ${v.coldDspInitialization(i)}
            },
            dspLoop: (${o.core.INPUT}, ${o.core.OUTPUT}) => {
                ${v.dspLoop(i)}
            },
            io: {
                messageReceivers: {
                    ${Object.entries(t.io.messageReceivers).map(([d,p])=>c`${d}: {
                            ${Object.entries(p).map(([m,{functionName:$}])=>`"${m}": ${$},`)}
                        },`)}
                },
                messageSenders: {
                    ${Object.entries(n.io.messageSenders).map(([d,p])=>c`${d}: {
                            ${p.map(m=>`"${m}": () => undefined,`)}
                        },`)}
                },
            }
        }

        ${v.importsExports(i,({name:d})=>c`
                exports.${d} = () => { throw new Error('import for ${d} not provided') }
                const ${d} = (...args) => exports.${d}(...args)
            `,d=>c`exports.${d} = ${d}`)}
    `)};var zi=e=>{let{precompiledCode:t,settings:n,variableNamesReadOnly:r}=e,a=r.globals,o={settings:n,globals:a,precompiledCode:t},{channelCount:i}=n.audio,l=tn(e);return re(an,c`
        const metadata: string = '${Mi(l)}'

        ${v.dependencies(o)}
        ${v.nodeImplementationsCoreAndStateClasses(o)}

        ${v.nodeStateInstances(o)}
        ${v.portletsDeclarations(o)}

        ${v.coldDspFunctions(o)}
        ${v.ioMessageReceivers(o)}
        ${v.ioMessageSenders(o,d=>c`export declare function ${d}(m: ${a.msg.Message}): void`)}

        export function initialize(sampleRate: Float, blockSize: Int): void {
            ${a.core.INPUT} = createFloatArray(blockSize * ${i.in.toString()})
            ${a.core.OUTPUT} = createFloatArray(blockSize * ${i.out.toString()})
            ${a.core.SAMPLE_RATE} = sampleRate
            ${a.core.BLOCK_SIZE} = blockSize

            ${v.nodeInitializations(o)}
            ${v.coldDspInitialization(o)}
        }

        export function dspLoop(): void {
            ${v.dspLoop(o)}
        }

        export {
            metadata,
            ${Object.values(t.io.messageReceivers).map(d=>Object.values(d).map(({functionName:p})=>p+","))}
        }

        ${v.importsExports(o,({name:d,args:p,returnType:m})=>c`export declare function ${d} (${p.map($=>`${$.name}: ${$.type}`).join(",")}): ${m}`,d=>c`export { ${d} }`)}
    `)};var de={GLOBALS:"G",NODES:"N",NODE_TYPES:"NT",IO:"IO",COLD:"COLD"},Gi=w.Interface({nodes:w.Index(e=>w.Interface({signalOuts:w.Index(t=>w.Literal(()=>ue(de.NODES,e,"outs",t))),messageSenders:w.Index(t=>w.Literal(()=>ue(de.NODES,e,"snds",t))),messageReceivers:w.Index(t=>w.Literal(()=>ue(de.NODES,e,"rcvs",t))),state:w.LiteralDefaultNull(()=>ue(de.NODES,e,"state"))})),nodeImplementations:w.Index((e,{nodeImplementations:t})=>{let n=on(t,e),r=(n.flags?n.flags.alphaName:null)||e;return w.Index(a=>w.Literal(()=>ue(de.NODE_TYPES,r,a)))}),globals:w.Index(e=>w.Index(t=>["fs"].includes(e)?w.Literal(()=>ue(de.GLOBALS,e,t)):e==="core"?w.Literal(()=>t):w.Literal(()=>ue(de.GLOBALS,e,t)))),io:w.Interface({messageReceivers:w.Index(e=>w.Index(t=>w.Literal(()=>ue(de.IO,"rcv",e,t)))),messageSenders:w.Index(e=>w.Index(t=>w.Literal(()=>ue(de.IO,"snd",e,t))))}),coldDspGroups:w.Index(e=>w.Literal(()=>ue(de.COLD,e)))}),ji=({input:e,variableNamesIndex:t})=>w(Gi,t,e),Ki=e=>w.ensureValue({},Gi,e),qi=w.Interface({graph:w.Literal((e,t)=>({fullTraversal:[],hotDspGroup:{traversal:[],outNodesIds:[]},coldDspGroups:we({},t)})),nodeImplementations:w.Index((e,{nodeImplementations:t})=>w.Literal(()=>({nodeImplementation:on(t,e),stateClass:null,core:null})),(e,t)=>we({},t)),nodes:w.Index((e,{graph:t})=>w.Literal(()=>({nodeType:U(t,e).type,messageReceivers:{},messageSenders:{},signalOuts:{},signalIns:{},initialization:c``,dsp:{loop:c``,inlets:{}},state:null})),(e,t)=>we({},t)),dependencies:w.Literal(()=>({imports:[],exports:[],ast:g([])})),io:w.Interface({messageReceivers:w.Index(e=>w.Literal((t,n)=>we({},n)),(e,t)=>we({},t)),messageSenders:w.Index(e=>w.Literal((t,n)=>we({},n)),(e,t)=>we({},t))})}),Hi=({input:e,precompiledCode:t})=>w(qi,t,e),Yi=e=>w.ensureValue({},qi,e),ue=(...e)=>e.map(Pu).join("_"),Pu=e=>{if(!Du.exec(e))throw new Error(`Invalid variable name for code generation "${e}"`);return e},Du=/^[a-zA-Z0-9_]+$/;var Uu="core",Xi={namespace:Uu,code:({ns:e},t,{target:n,audio:{bitDepth:r}})=>{let o=r===32?"f32":"f64",i=r===32?"Float32Array":"Float64Array",l=r===32?"getFloat32":"getFloat64",d=r===32?"setFloat32":"setFloat64",p={toInt:u(e.toInt,[s("Float","v")],"Int"),toFloat:u(e.toFloat,[s("Int","v")],"Float"),createFloatArray:u(e.createFloatArray,[s("Int","length")],"FloatArray"),setFloatDataView:u(e.setFloatDataView,[s("DataView","dataView"),s("Int","position"),s("Float","value")],"void"),getFloatDataView:u(e.getFloatDataView,[s("DataView","dataView"),s("Int","position")],"Float")},m=[s("Int",e.IT_FRAME,"0"),s("Int",e.FRAME,"0"),s("Int",e.BLOCK_SIZE,"0"),s("Float",e.SAMPLE_RATE,"0"),s("Float",e.NULL_SIGNAL,"0"),s("FloatArray",e.INPUT,"createFloatArray(0)"),s("FloatArray",e.OUTPUT,"createFloatArray(0)")];if(n==="assemblyscript")return g([`
                type FloatArray = ${i}
                type Float = ${o}
                type Int = i32
                `,p.toInt`
                    return ${"i32"}(v)
                `,p.toFloat`
                    return ${o}(v)
                `,p.createFloatArray`
                    return new ${i}(length)
                `,p.setFloatDataView`
                    dataView.${d}(position, value)
                `,p.getFloatDataView`
                    return dataView.${l}(position)
                `,u(e.x_createListOfArrays,[],"FloatArray[]")`
                    const arrays: FloatArray[] = []
                    return arrays
                `,u(e.x_pushToListOfArrays,[s("FloatArray[]","arrays"),s("FloatArray","array")],"void")`
                    arrays.push(array)
                `,u(e.x_getListOfArraysLength,[s("FloatArray[]","arrays")],"Int")`
                    return arrays.length
                `,u(e.x_getListOfArraysElem,[s("FloatArray[]","arrays"),s("Int","index")],"FloatArray")`
                    return arrays[index]
                `,u(e.x_getInput,[],"FloatArray")`
                    return ${e.INPUT}
                `,u(e.x_getOutput,[],"FloatArray")`
                    return ${e.OUTPUT}
                `,...m]);if(n==="javascript")return g([`
                const i32 = (v) => v
                const f32 = i32
                const f64 = i32
                `,p.toInt`
                    return v
                `,p.toFloat`
                    return v
                `,p.createFloatArray`
                    return new ${i}(length)
                `,p.setFloatDataView`
                    dataView.${d}(position, value)
                `,p.getFloatDataView`
                    return dataView.${l}(position)
                `,...m]);throw new Error(`Unexpected target: ${n}`)},exports:({ns:e},t,{target:n})=>n==="assemblyscript"?[e.x_createListOfArrays,e.x_pushToListOfArrays,e.x_getListOfArraysLength,e.x_getListOfArraysElem,e.x_getInput,e.x_getOutput,e.createFloatArray]:[]};var Ji=(e,t)=>{let{settings:n,variableNamesAssigner:r,precompiledCodeAssigner:a}=e,o=Zi([...t,...zu(e)]),i=Z(e.variableNamesIndex.globals);a.dependencies.ast=Bu(o,r,i,n),a.dependencies.exports=Wu(o,r,i,n),a.dependencies.imports=Vu(o,r,i,n)},Bu=(e,t,n,r)=>g(e.map(a=>a.code(mr(t,a),n,r)).reduce((a,o)=>a.every(i=>!Gu(i,o))?[...a,o]:a,[])),Qi=()=>[Xi,W,V,X],Wu=(e,t,n,r)=>e.reduce((a,o)=>o.exports?[...a,...o.exports(mr(t,o),n,r).filter(i=>a.every(l=>i!==l))]:a,[]),Vu=(e,t,n,r)=>e.reduce((a,o)=>o.imports?[...a,...o.imports(mr(t,o),n,r).filter(i=>a.every(l=>i.name!==l.name))]:a,[]),Zi=e=>e.flatMap(t=>t.dependencies?[...Zi(t.dependencies),t]:[t]),zu=({graph:e,precompiledCodeAssigner:t})=>ne(e,t.graph.fullTraversal).reduce((n,r)=>{let a=t.nodes[r.id],o=t.nodeImplementations[a.nodeType];return[...n,...o.nodeImplementation.dependencies||[]]},[]),Gu=(e,t)=>JSON.stringify(e)===JSON.stringify(t),mr=(e,t)=>({ns:ju(e,t)}),ju=(e,t)=>e.globals[t.namespace];var tl=(e,t)=>{if(typeof e!="object"||e.astType!=="Func")throw new Error(`Expected an ast Func, got : ${e}`);if(e.args.length!==t.args.length||e.args.some((n,r)=>{let a=t.args[r];return!a||n.type!==a.type})||e.returnType!==t.returnType)throw new Error(`Func should be have signature ${el(t)} got instead ${el(e)}`);return e},el=e=>`(${e.args.map(t=>`${t.name}: ${t.type}`).join(", ")}) => ${e.returnType}`;var nl=({settings:e,variableNamesAssigner:t,precompiledCodeAssigner:n},r)=>{let a=n.nodes[r.id],o=n.nodeImplementations[a.nodeType];if(o.nodeImplementation.state){let{ns:i,globals:l}=mt(r.id,a,t),d=o.nodeImplementation.state({ns:i,node:r},l,e);a.state={name:t.nodes[r.id].state,initialization:d.members.reduce((p,m)=>({...p,[m.name]:m.value}),{})}}},rl=({settings:e,variableNamesAssigner:t,precompiledCodeAssigner:n},r)=>{let a=n.nodes[r.id],o=n.nodeImplementations[a.nodeType],{state:i,snds:l,ns:d,globals:p}=mt(r.id,a,t),m=Fe(o.nodeImplementation.messageReceivers?o.nodeImplementation.messageReceivers({ns:d,state:i,snds:l,node:r},p,e):{},r.id,"messageReceivers");Object.keys(a.messageReceivers).forEach($=>{let M=m[$];tl(M,f([s(p.msg.Message,"m")],"void")``);let x=a.messageReceivers[$];x.name=t.nodes[r.id].messageReceivers[$],x.args=M.args,x.body=M.body,x.returnType=M.returnType})},al=({settings:e,variableNamesAssigner:t,precompiledCodeAssigner:n},r)=>{let a=n.nodes[r.id],o=n.nodeImplementations[a.nodeType],{state:i,snds:l,ns:d,globals:p}=mt(r.id,a,t);a.initialization=o.nodeImplementation.initialization?o.nodeImplementation.initialization({ns:d,state:i,snds:l,node:r},p,e):c``},ol=({settings:e,variableNamesAssigner:t,precompiledCodeAssigner:n},r)=>{let a=n.nodes[r.id],o=n.nodeImplementations[a.nodeType],{outs:i,ins:l,snds:d,state:p,ns:m,globals:$}=mt(r.id,a,t);if(!o.nodeImplementation.dsp)throw new Error(`No dsp to generate for node ${r.type}:${r.id}`);let M=o.nodeImplementation.dsp({ns:m,node:r,state:p,ins:l,outs:i,snds:d},$,e);if(o.nodeImplementation.flags&&o.nodeImplementation.flags.isDspInline){if("loop"in M)throw new Error(`Invalid dsp definition for inlinable node ${r.type}:${r.id}`);let x=Object.keys(r.outlets)[0];a.dsp.loop=c`${t.nodes[r.id].signalOuts[x]} = ${M}`}else"loop"in M?(a.dsp.loop=M.loop,Object.entries(M.inlets).forEach(([x,k])=>{a.dsp.inlets[x]=k})):a.dsp.loop=M},sl=({graph:e,settings:t,variableNamesAssigner:n,precompiledCodeAssigner:r},a)=>{let o=a.traversal.reduce((l,d)=>{let p=r.nodes[d],m=r.nodeImplementations[p.nodeType],{ins:$,outs:M,snds:x,state:k,ns:E,globals:ae}=mt(d,p,n),oe=U(e,d),un=A(Object.values(oe.inlets).map(Re=>[Re,Se(oe,Re.id)]).filter(([Re,ft])=>Re.type==="signal"&&ft.length>0&&a.traversal.includes(ft[0].nodeId)),([Re,ft])=>{let cn=ft[0];if(!(cn.nodeId in l))throw new Error(`Unexpected error : inlining failed, missing inlined source ${cn.nodeId}`);return[Re.id,l[cn.nodeId]]});if(!m.nodeImplementation.dsp)throw new Error(`No dsp to generate for node ${oe.type}:${oe.id}`);let pn=m.nodeImplementation.dsp({ns:E,state:k,ins:Fe({...$,...un},d,"ins"),outs:M,snds:x,node:oe},ae,t);if(!("astType"in pn))throw new Error("Inlined dsp can only be an AstSequence");return{...l,[d]:"("+re(Li(t.target),pn)+")"}},{}),i=Ku(e,a);r.nodes[i.nodeId].signalIns[i.portletId]=o[a.outNodesIds[0]]},mt=(e,t,n)=>({globals:Z(n.globals),ns:Z(n.nodeImplementations[t.nodeType]),state:t.state?t.state.name:"",ins:Fe(t.signalIns,e,"ins"),outs:Fe(t.signalOuts,e,"outs"),snds:Fe(Object.entries(t.messageSenders).reduce((r,[a,{messageSenderName:o}])=>({...r,[a]:o}),{}),e,"snds"),rcvs:Fe(Object.entries(t.messageReceivers).reduce((r,[a,o])=>({...r,[a]:o.name}),{}),e,"rcvs")}),Ku=(e,t)=>{let n=U(e,t.outNodesIds[0]);return Object.entries(n.sinks).find(([r])=>me(n,r).type==="signal")[1][0]};var il=(e,t,n)=>{let{variableNamesAssigner:r,precompiledCodeAssigner:a}=e,o=nt(t,n),i=r.nodes[t.id].signalOuts[n];a.nodes[t.id].signalOuts[n]=i,o.forEach(({portletId:l,nodeId:d})=>{a.nodes[d].signalIns[l]=i})},ll=({variableNamesAssigner:e,precompiledCodeAssigner:t},n,r)=>{t.nodes[n.id].signalIns[r]=e.globals.core.NULL_SIGNAL},dl=({variableNamesAssigner:e,precompiledCodeAssigner:t},n,r)=>{let a=nt(n,r),o=t.nodes[n.id],i=[...a.map(({nodeId:l,portletId:d})=>e.nodes[l].messageReceivers[d]),...a.reduce((l,d)=>{let m=Object.entries(t.graph.coldDspGroups).filter(([$,{dspGroup:M}])=>Bi(M,d.nodeId)).map(([$])=>$).map($=>e.coldDspGroups[$]);return[...l,...m]},[])];i.length>1?o.messageSenders[r]={messageSenderName:e.nodes[n.id].messageSenders[r],sinkFunctionNames:i}:i.length===1?o.messageSenders[r]={messageSenderName:i[0],sinkFunctionNames:[]}:o.messageSenders[r]={messageSenderName:e.globals.msg.VOID_MESSAGE_RECEIVER,sinkFunctionNames:[]}},ul=({variableNamesAssigner:e,precompiledCodeAssigner:t},n,r)=>{let a=t.nodes[n.id],o=e.globals;if(Se(n,r).length>=1){let i=e.nodes[n.id].messageReceivers[r];a.messageReceivers[r]=u(i,[s(o.msg.Message,"m")],"void")`throw new Error("This placeholder should have been replaced during precompilation")`}};var qu="State",pl=({graph:e,settings:t,variableNamesReadOnly:n,variableNamesAssigner:r,precompiledCodeAssigner:a},o)=>{let i=a.nodeImplementations[o];if(i.nodeImplementation.state){let l=Object.values(e).find(p=>p.type===o);if(!l)throw new Error(`No node of type "${o}" exists in the graph.`);hr(o,r)[qu];let d=i.nodeImplementation.state({ns:hr(o,n),node:l},n.globals,t);i.stateClass={...d,members:d.members.map(p=>({...p,value:void 0}))}}},cl=({settings:e,variableNamesReadOnly:t,variableNamesAssigner:n,precompiledCodeAssigner:r},a)=>{let o=r.nodeImplementations[a],i=o.nodeImplementation;i.core&&(o.core=i.core({ns:hr(a,n)},t.globals,e))},hr=(e,t)=>t.nodeImplementations[e];var ln="_messageReceiver",Hu={},dn="_messageSender",Yu={messageReceivers:({node:{args:e}},{msg:t})=>({0:f([s(t.Message,"m")])`
                ${e.messageSenderName}(m)
                return
            `})},ml=e=>{if(e[ln])throw new Error(`Reserved node type '${ln}' already exists. Please use a different name.`);if(e[dn])throw new Error(`Reserved node type '${dn}' already exists. Please use a different name.`);e[ln]=Hu,e[dn]=Yu},hl=({precompiledCode:e,graph:t,variableNamesAssigner:n,precompiledCodeAssigner:r},a,o)=>{let i=gl(t,"messageReceiver",a,o),l={...Ie(i,ln),isPushingMessages:!0,outlets:{0:{id:"0",type:"message"}}};be(t,l),Q(t,{nodeId:i,portletId:"0"},{nodeId:a,portletId:o}),r.io.messageReceivers[a][o]={functionName:n.io.messageReceivers[a][o],getSinkFunctionName:()=>e.nodes[i].messageSenders[0].messageSenderName}},fl=({graph:e,variableNamesAssigner:t,precompiledCodeAssigner:n},r,a)=>{let o=gl(e,"messageSender",r,a),i=t.io.messageSenders[r][a],l={...Ie(o,dn),args:{messageSenderName:i},inlets:{0:{id:"0",type:"message"}}};be(e,l),Q(e,{nodeId:r,portletId:a},{nodeId:o,portletId:"0"}),n.io.messageSenders[r][a]={functionName:i}},gl=(e,t,n,r)=>{let a=`n_io${t==="messageReceiver"?"Rcv":"Snd"}_${n}_${r}`;if(e[a])throw new Error(`Node id ${a} already exists in graph`);return a};var yl=e=>{let t=Xu(e);ml(t.nodeImplementations),Object.entries(e.settings.io.messageReceivers).forEach(([d,p])=>{p.forEach(m=>{hl(t,d,m)})}),Object.entries(e.settings.io.messageSenders).forEach(([d,p])=>{p.forEach(m=>{fl(t,d,m)})}),t.graph=Oi(t.graph,lr(t.graph)),t.nodeImplementations=Ci(t.graph,t.nodeImplementations),t.precompiledCode.graph.fullTraversal=lr(t.graph);let n=ne(t.graph,t.precompiledCode.graph.fullTraversal);Ji(t,Qi()),Object.keys(t.nodeImplementations).forEach(d=>{cl(t,d),pl(t,d)}),n.forEach(d=>{nl(t,d)});let r={traversal:sn(t.graph),outNodesIds:dr(t.graph).map(d=>d.id)},a=Di(t,r),o=Pi(t,r,a),i=[o,...a],l=i.flatMap(d=>{let p=Ui(t,d);return d.traversal=cr(d.traversal,p.flatMap(m=>m.traversal)),p});return t.precompiledCode.graph.hotDspGroup=o,a.forEach((d,p)=>{Ri(t,d,`${p}`)}),n.forEach(d=>{Object.values(d.inlets).forEach(p=>{p.type==="signal"?Se(d,p.id).length===0&&ll(t,d,p.id):p.type==="message"&&ul(t,d,p.id)})}),n.forEach(d=>{Object.values(d.outlets).filter(p=>p.type==="message").forEach(p=>{dl(t,d,p.id)})}),i.forEach(d=>{ne(t.graph,d.traversal).forEach(p=>{Object.values(p.outlets).forEach(m=>{il(t,p,m.id)})})}),l.forEach(d=>{sl(t,d)}),i.forEach(d=>{ne(t.graph,d.traversal).forEach(p=>{ol(t,p)})}),n.forEach(d=>{al(t,d),rl(t,d)}),t},Xu=e=>{let t={graph:{...e.graph},nodeImplementations:{...e.nodeImplementations},settings:e.settings},n=Yi(t),r=Ki(t);return{...t,precompiledCode:n,variableNamesIndex:r,variableNamesAssigner:ji({variableNamesIndex:r,input:t}),variableNamesReadOnly:Z(r),precompiledCodeAssigner:Hi({precompiledCode:n,input:t})}};var $l=(e,t)=>{let n=e.arrays||{},r={messageReceivers:(e.io||{}).messageReceivers||{},messageSenders:(e.io||{}).messageSenders||{}},a=e.debug||!1,o=e.audio||{channelCount:{in:2,out:2},bitDepth:64};if(![32,64].includes(o.bitDepth))throw new fr('"bitDepth" can be only 32 or 64');let i=e.customMetadata||{};return{audio:o,arrays:n,io:r,debug:a,target:t,customMetadata:i}},fr=class extends Error{};var Sl=(e,t,n,r)=>{let a=$l(r,n),{precompiledCode:o,variableNamesIndex:i}=yl({graph:e,nodeImplementations:t,settings:a}),l,d={precompiledCode:o,settings:a,variableNamesReadOnly:Z(i)};if(n==="javascript")l=Vi(d);else if(n==="assemblyscript")l=zi(d);else throw new Error(`Invalid target ${n}`);return{status:0,code:l}};var gr=()=>({}),yr=(e,t,n)=>{switch(n){case"pd":return{...e,pd:Pe(t)};case"pdJson":return{...e,pdJson:JSON.parse(Pe(t))};case"dspGraph":return{...e,dspGraph:JSON.parse(Pe(t))};case"javascript":return{...e,javascript:Pe(t)};case"assemblyscript":return{...e,assemblyscript:Pe(t)};case"wasm":return{...e,wasm:t};case"wav":return{...e,wav:new Uint8Array(t)};default:throw new Error(`Unexpected format for preloading ${n}`)}},$r=async(e,t,{nodeBuilders:n,nodeImplementations:r,audioSettings:a,renderAudioSettings:o,io:i={},abstractionLoader:l})=>{let d=[],p=[];switch(t){case"pdJson":let m=Rr(e.pd);return m.status===0?(e.pdJson=m.pd,{status:0,warnings:ht(m.warnings)}):{status:1,warnings:ht(m.warnings),errors:ht(m.errors)};case"dspGraph":let $=await Hr(e.pdJson,n,l);if($.abstractionsLoadingWarnings&&(d=Object.entries($.abstractionsLoadingWarnings).filter(([x,k])=>!!k.length).flatMap(([x,k])=>[`Warnings when parsing abstraction ${x} :`,...ht(k)])),$.status===0)return e.dspGraph=$,{status:0,warnings:d};{let x=Object.values($.abstractionsLoadingErrors).filter(k=>!!k.unknownNodeType).map(k=>k.unknownNodeType);return x.length&&(p=[...p,...Ju(new Set(x))]),p=[...p,...Object.entries($.abstractionsLoadingErrors).filter(([k,E])=>!!E.parsingErrors).flatMap(([k,E])=>[`Failed to parse abstraction ${k} :`,...ht(E.parsingErrors)])],{status:1,errors:p,warnings:d}}case"javascript":case"assemblyscript":let M=Sl(e.dspGraph.graph,r,t,_i({audio:a,io:i,arrays:e.dspGraph.arrays},e.dspGraph.graph,e.pdJson));return t==="javascript"?e.javascript=M.code:e.assemblyscript=M.code,{status:0,warnings:[]};case"wasm":try{e.wasm=await Ir(et(e,"assemblyscript"),a.bitDepth)}catch(x){return{status:1,errors:[x.message],warnings:[]}}return{status:0,warnings:[]};case"wav":return e.wav=await Wa(o.previewDurationSeconds,e,{...a,...o}),{status:0,warnings:[]};case"app":return e.app=await ua(e),{status:0,warnings:[]};default:throw new Error(`invalid build step ${t}`)}},Ju=e=>[`Unknown object types ${Array.from(e).map(t=>`${t}`).join(", ")}`],ht=e=>e.map(({message:t,lineIndex:n})=>`line ${n+1} : ${t}`);async function h0(e,t=44100){let n=yr(gr(),new TextEncoder().encode(e).buffer,"pd"),r={nodeBuilders:or,nodeImplementations:sr,audioSettings:{channelCount:{in:2,out:2},bitDepth:32},renderAudioSettings:{sampleRate:t,blockSize:128,previewDurationSeconds:1},io:{}},a=[];for(let o of Kn("pd","javascript")){let i=await $r(n,o,r);if(a.push(...i.warnings||[]),i.status!==0)return{erreurs:i.errors,avertissements:a}}return{js:n.javascript,avertissements:a}}export{h0 as compilerPd};
