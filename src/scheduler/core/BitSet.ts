// core/BitSet.ts

/**
 * Conjunto de bits eficiente usando Uint32Array.
 * Ideal para domínios (slots livres) e conjuntos de ocupação.
 */
export class BitSet {
  private data: Uint32Array;
  readonly size: number; // número total de bits

  constructor(size: number) {
    this.size = size;
    // quantidade de entradas de 32 bits necessárias
    this.data = new Uint32Array(Math.ceil(size / 32));
  }

  /** Ativa o bit na posição index (0‑based) */
  set(index: number): void {
    const word = index >>> 5;
    const bit = index & 31;
    this.data[word] |= (1 << bit);
  }

  /** Desativa o bit */
  clear(index: number): void {
    const word = index >>> 5;
    const bit = index & 31;
    this.data[word] &= ~(1 << bit);
  }

  /** Verifica se o bit está ativo */
  has(index: number): boolean {
    const word = index >>> 5;
    const bit = index & 31;
    return (this.data[word] & (1 << bit)) !== 0;
  }

  /** Retorna array de índices ativos (para iteração ocasional) */
  toArray(): number[] {
    const result: number[] = [];
    for (let i = 0; i < this.data.length; i++) {
      let word = this.data[i];
      let base = i << 5;
      while (word !== 0) {
        const bit = 31 - Math.clz32(word); // posição do bit mais significativo
        result.push(base + bit);
        word ^= (1 << bit);
      }
    }
    return result.sort((a, b) => a - b); // ordem garantida
  }

  /** Número de bits ativos (popcount) */
  count(): number {
    let cnt = 0;
    for (let i = 0; i < this.data.length; i++) {
      cnt += popcnt32(this.data[i]);
    }
    return cnt;
  }

  /** Clona o conjunto */
  clone(): BitSet {
    const bs = new BitSet(this.size);
    bs.data = new Uint32Array(this.data);
    return bs;
  }

  /** Operações bit a bit (para propagação) */
  and(other: BitSet): BitSet {
    const result = new BitSet(this.size);
    for (let i = 0; i < this.data.length; i++) {
      result.data[i] = this.data[i] & other.data[i];
    }
    return result;
  }

  or(other: BitSet): BitSet {
    const result = new BitSet(this.size);
    for (let i = 0; i < this.data.length; i++) {
      result.data[i] = this.data[i] | other.data[i];
    }
    return result;
  }

  /** Remove todos os bits que estão em other (AND NOT) */
  andNot(other: BitSet): void {
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] &= ~other.data[i];
    }
  }
}

// Função auxiliar para contar bits em 32 bits
function popcnt32(v: number): number {
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
}
