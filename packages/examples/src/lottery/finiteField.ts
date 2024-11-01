// Generic finite field library that should be swapable with galois
// Ididn't use galois due to issues with Bigint serialization
// Just contains the operators we need for this example

class Field {

  prime: number;
  zero = 0;

  constructor(prime: number) {
    this.prime = prime;
  }

  add(a: number, b: number) {
    return (a + b) % this.prime;
  }

  sub(a: number, b: number) {
    const x = (a - b) % this.prime;
    if (x < 0) { // I think this is right
      return x + this.prime;
    } else {
      return x;
    }
  }

  rand() {
    return Math.floor(Math.random() * this.prime);
  }


}

export default Field;