const Readline = require('readline');
const File = require("fs");

function Keyboard() {
  this.rl = Readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "",
  });

  this.buffer = new Uint16Array(0);
  this.index = 1;
}

Keyboard.prototype = {
  next() {
    if (this.index < this.buffer.length) {
      return new Promise((resolve, reject) => {
        resolve(this.buffer[this.index++]);
      });
    } else if (this.index === this.buffer.length) {
      return new Promise((resolve, reject) => {
        this.index += 1;
        resolve("\n".charCodeAt(0));
      });
    } else {
      return new Promise((resolve, reject) => {
        this.rl.question("", (answer) => {
          this.buffer = new Uint16Array(
            answer.split(/(?:)/g).map(x => x.charCodeAt(0))
          );
          this.index = 0;

          resolve(this.buffer[this.index++]);
        });
      });
    }
  }
};


// Argument counts for each instruction
const arch = [
  /* 0*/ 0,
  /* 1*/ 2,
  /* 2*/ 1,
  /* 3*/ 1,
  /* 4*/ 3,
  /* 5*/ 3,
  /* 6*/ 1,
  /* 7*/ 2,
  /* 8*/ 2,
  /* 9*/ 3,
  /*10*/ 3,
  /*11*/ 3,
  /*12*/ 3,
  /*13*/ 3,
  /*14*/ 2,
  /*15*/ 2,
  /*16*/ 2,
  /*17*/ 1,
  /*18*/ 0,
  /*19*/ 1,
  /*20*/ 1,
  /*21*/ 0,
];


function SynacorVM(input) {
  this.memory = new Uint16Array(32768);
  this.registers = new Uint16Array(8);
  this.stack = [];
  this.pc = 0;

  this.input = input;
}

SynacorVM.prototype = {
  loadBinary(base_address, binary) {
    for (let i = 0; i < binary.length; i += 2) {
      vm.memory[base_address + i/2] = ((binary[i+1] << 8) | binary[i]);
    }
  },

  get(addr) {
    if (addr < 32768) {
      return addr;
    } else if (addr - 32768 < 8) {
      return this.registers[addr-32768];
    } else {
      throw new Error("[get] Immediate out-of-bounds");
    }
  },

  set(addr, value) {
    if (addr < 32768) {
      throw new Error("[set] Cannot set immediate");
    } else if (addr - 32768 < 8) {
      this.registers[addr-32768] = value;
    } else {
      throw new Error("[set] Immediate out-of-bounds");
    }
  },

  fetch() {
    const insn = new Uint16Array(4);

    insn[0] = this.memory[this.pc++];
    if (insn[0] >= arch.length) {
      throw new Error("Unknown instruction "+insn[0]);
    }

    for (let i = 1; i < 1+arch[insn[0]]; ++i) {
      insn[i] = this.memory[this.pc++];
    }

    return insn;
  },

  async execute(insn) {
    switch (insn[0]) {
      case undefined: {
        throw new Error("Out of bounds: " + this.pc);
      } break;

      case 0: {
        return false;
      } break;

      case 1: {
        const dest = insn[1];
        const source = insn[2];
        this.set(dest, this.get(source));
      } break;

      case 2: {
        const source = insn[1];
        this.stack.push(this.get(source));
      } break;

      case 3: {
        const dest = insn[1];
        this.set(dest, this.stack.pop());
      } break;

      case 4: {
        const dest = insn[1];
        const lhs = insn[2];
        const rhs = insn[3];
        this.set(dest, 0 + (this.get(lhs) === this.get(rhs)));
      } break;

      case 5: {
        const dest = insn[1];
        const lhs = insn[2];
        const rhs = insn[3];
        this.set(dest, 0 + (this.get(lhs) > this.get(rhs)));
      } break;

      case 6: {
        const target = insn[1];
        this.pc = this.get(target);
      } break;

      case 7: {
        const condition = insn[1];
        const target = insn[2];
        if (this.get(condition)) {
          this.pc = this.get(target);
        }
      } break;

      case 8: {
        const condition = insn[1];
        const target = insn[2];
        if (!this.get(condition)) {
          this.pc = this.get(target);
        }
      } break;

      case 9: {
        const dest = insn[1];
        const lhs = insn[2];
        const rhs = insn[3];
        this.set(dest, (this.get(lhs) + this.get(rhs)) % 32768);
      } break;

      case 10: {
        const dest = insn[1];
        const lhs = insn[2];
        const rhs = insn[3];
        this.set(dest, (this.get(lhs) * this.get(rhs)) % 32768);
      } break;

      case 11: {
        const dest = insn[1];
        const lhs = insn[2];
        const rhs = insn[3];
        this.set(dest, this.get(lhs) % this.get(rhs));
        // what if rhs === 0?
      } break;

      case 12: {
        const dest = insn[1];
        const lhs = insn[2];
        const rhs = insn[3];
        this.set(dest, this.get(lhs) & this.get(rhs));
      } break;

      case 13: {
        const dest = insn[1];
        const lhs = insn[2];
        const rhs = insn[3];
        this.set(dest, this.get(lhs) | this.get(rhs));
      } break;

      case 14: {
        const dest = insn[1];
        const arg = insn[2];
        this.set(dest, ~this.get(arg) & 0x7FFF);
      } break;

      case 15: {
        const dest = insn[1];
        const source = insn[2];
        this.set(dest, this.memory[this.get(source)]);
      } break;

      case 16: {
        const dest = insn[1];
        const source = insn[2];
        this.memory[this.get(dest)] = this.get(source);
      } break;

      case 17: {
        const target = insn[1];
        this.stack.push(this.pc);
        this.pc = this.get(target);
      } break;

      case 18: {
        this.pc = this.stack.pop();
      } break;

      case 19: {
        const arg = insn[1];
        process.stdout.write(String.fromCharCode(this.get(arg)));
      } break;

      case 20: {
        const arg = insn[1];
        const ch = await this.input.next();
        this.set(arg, ch);
      } break;

      case 21: {
        // Do nothing
      } break;
    }

    return true;
  }
};

function da(addr) {
  if (addr < 32768) {
    return ""+addr;
  } else if (addr - 32768 < 8) {
    return "r"+(addr - 32768);
  } else {
    return "<BAD>";
  }
}

function debuginsn(insn) {
  switch (insn[0]) {
    case  0: return `halt`;
    case  1: return `set  ${da(insn[1])} ${da(insn[2])}`;
    case  2: return `push ${da(insn[1])}`;
    case  3: return `pop  ${da(insn[1])}`;
    case  4: return `eq   ${da(insn[1])} ${da(insn[2])} ${da(insn[3])}`;
    case  5: return `gt   ${da(insn[1])} ${da(insn[2])} ${da(insn[3])}`;
    case  6: return `jmp  ${da(insn[1])}`;
    case  7: return `jt   ${da(insn[1])} ${da(insn[2])}`;
    case  8: return `jf   ${da(insn[1])} ${da(insn[2])}`;
    case  9: return `add  ${da(insn[1])} ${da(insn[2])} ${da(insn[3])}`;
    case 10: return `mult ${da(insn[1])} ${da(insn[2])} ${da(insn[3])}`;
    case 11: return `mod  ${da(insn[1])} ${da(insn[2])} ${da(insn[3])}`;
    case 12: return `and  ${da(insn[1])} ${da(insn[2])} ${da(insn[3])}`;
    case 13: return `or   ${da(insn[1])} ${da(insn[2])} ${da(insn[3])}`;
    case 14: return `not  ${da(insn[1])} ${da(insn[2])}`;
    case 15: return `rmem ${da(insn[1])} ${da(insn[2])}`;
    case 16: return `wmem ${da(insn[1])} ${da(insn[2])}`;
    case 17: return `call ${da(insn[1])}`;
    case 18: return `ret`;
    case 19: return `out  ${da(insn[1])}`;
    case 20: return `in   ${da(insn[1])}`;
    case 21: return `noop`;
    default: return `<BAD>`;
  }
}



const vm = new SynacorVM(new Keyboard());
vm.loadBinary(0x0000, File.readFileSync("challenge.bin"));

function patch_teleporter(r7) {
  // Set r7 to the desired value
  vm.memory[521] = 1
  vm.memory[522] = 0x8007
  vm.memory[523] = r7

  // Disable the r7 validation
  vm.memory[5485] = 6
  vm.memory[5486] = 21
  vm.memory[5487] = 21
  vm.memory[5488] = 21
  vm.memory[5489] = 21
  vm.memory[5490] = 21
}

async function execute() {
  while (true) {
    if (!await vm.execute(vm.fetch())) {
      break;
    }
  }
};

async function disassemble() {
  const f = File.openSync("disassembly.txt", "w");
  while (vm.pc < 6068) {
    let pc = vm.pc;
    try {
      let insn = vm.fetch();
      File.writeSync(f, ("00000"+pc).slice(-5) + " " + debuginsn(insn) + "\n");
    } catch (ex) {
      File.writeSync(f, ("00000"+pc).slice(-5) + " " + ex.message + "\n");
    }
  }
  File.closeSync(f);
}

(async function main() {
  // Make the teleporter go to the vault area
  // (see teleporter.js)
  patch_teleporter(25734);

  try {
    /**/ // Toggle comment to switch between execution and disassembly
    await execute();
    /*/
    await disassemble();
    //*/
  } catch (ex) {
    console.log(ex);
  }
})();
