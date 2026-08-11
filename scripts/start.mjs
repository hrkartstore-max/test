import {spawn} from "node:child_process";
const npm=process.platform==="win32"?"npm.cmd":"npm";
const backend=spawn(npm,["--prefix","backend","run","start"],{stdio:"inherit"});
const frontend=spawn(npm,["--prefix","frontend","run","start"],{stdio:"inherit"});
const stop=()=>[backend,frontend].forEach(p=>{try{p.kill("SIGTERM")}catch{}});
process.on("SIGINT",()=>{stop();process.exit(0)});
process.on("SIGTERM",()=>{stop();process.exit(0)});
[backend,frontend].forEach(p=>p.on("exit",code=>{if(code&&code!==0){stop();process.exit(code)}}));
