# The Game of Life

## Rules

Conway's Game of Life is a two-state cellular automaton on a 2D grid. Each cell examines its
8 Moore-neighborhood neighbors and updates deterministically:

- A **dead cell** becomes alive if it has exactly **3** alive neighbors (birth).
- A **live cell** stays alive if it has **2 or 3** alive neighbors (survival); otherwise it dies.

That's all. No randomness. No hidden state. Every future of the universe is determined by its
present configuration.

## B/S notation

Life-like rules generalize Conway's rules to arbitrary totalistic functions on a Moore neighborhood.
A rule is written **B{b_1,b_2,…}/S{s_1,s_2,…}** where:

- **B** lists the neighbor counts that cause a dead cell to be born.
- **S** lists the neighbor counts that let a live cell survive.

Conway's Life is **B3/S23**. Other named rules shipped in this simulator:

| Rule                 | Notation        | Character                                  |
|----------------------|-----------------|--------------------------------------------|
| HighLife             | B36/S23         | Like Life, but has a self-replicator.       |
| Seeds                | B2/S            | Every cell dies each generation; explosive.|
| Day & Night          | B3678/S34678    | Symmetric under state inversion.           |
| Life Without Death   | B3/S012345678   | Once born, never dies; grows forever.      |
| Replicator           | B1357/S1357     | Every pattern replicates.                  |
| 34 Life              | B34/S34         | Chaotic; oscillators abound.               |
| Diamoeba             | B3578/S5678     | Amoeba-like growing blobs.                 |
| Maze                 | B3/S12345       | Stabilizes into maze-like patterns.         |
| Mazectric            | B3/S1234        | Similar, but produces straighter corridors.|
| Coagulations         | B378/S235678    | Coagulating chaotic regions.                |
| Assimilation         | B345/S4567      | Large patterns grow, absorb, stabilize.     |

In this simulator both **B** and **S** are stored as 9-bit bitmasks in the uniform buffer, and
the Rule Editor lets you flip individual bits to explore the full 512×512 space of Life-like
rules. Around 20 of them are "interesting"; the rest are mostly explosions or stasis.

## Famous patterns

- **Still lifes** — block, beehive, loaf, boat. Fixed points: they don't change.
- **Oscillators** — blinker (period 2), toad (period 2), beacon (period 2), pulsar (period 3),
  pentadecathlon (period 15). Periodic configurations.
- **Spaceships** — glider (period 4, moves diagonally), LWSS/MWSS/HWSS (period 4, move
  orthogonally at c/2). Translate across the grid forever.
- **Guns** — the Gosper glider gun emits a glider every 30 generations forever, proving that
  Life is unbounded-population capable.
- **Methuselahs** — small seeds that evolve chaotically for hundreds of generations before
  stabilizing. The R-pentomino runs for 1103 generations from just 5 cells. Acorn produces a
  stable population of 633 over ~5206 generations from 7 cells.

## Universality

Life is Turing-complete. Patterns like the Gosper gun, eaters, and reflectors can be composed
into logic gates; logic gates can be composed into memory and a program counter; and from there
into a full computer. Several hobbyists have built working Turing machines, binary adders, and
even a Life-within-Life metapixel in-game — see the LifeWiki.

## Further reading

- [LifeWiki](https://conwaylife.com/wiki/) — comprehensive pattern and rule encyclopedia.
- Gardner, M. (1970). "Mathematical Games: The fantastic combinations of John Conway's new
  solitaire game 'life'". *Scientific American*, 223(4), 120–123.
