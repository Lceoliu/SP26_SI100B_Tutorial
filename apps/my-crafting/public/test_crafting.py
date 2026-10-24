"""Local tester for My Crafting (Python 3.9+).

Save your crafting function in solution.py, then run:
    python test_crafting.py solution.py

Only the three public examples are tested. Submit solution.py, not this file.
"""

import argparse
import runpy
import sys
import unittest


class CraftingExamples(unittest.TestCase):
    def test_example_1_returns_book(self):
        result = crafting(
            ["oak_planks 4 oak_log", "book 1 paper paper paper leather"],
            ["paper", "leather", "paper", "paper"],
        )
        self.assertIs(type(result), tuple, "Return a tuple, not a list or string.")
        self.assertEqual(len(result), 2)
        self.assertIs(type(result[0]), str)
        self.assertIs(type(result[1]), int, "The quantity must be an integer.")
        self.assertEqual(result, ("book", 1))

    def test_example_2_raises_lookup_error(self):
        with self.assertRaises(LookupError) as caught:
            crafting(
                ["book 1 paper paper paper leather"],
                ["paper", "leather", "leather", "paper"],
            )
        self.assertIs(type(caught.exception), LookupError,
                      "Raise LookupError itself, not a subclass such as KeyError.")

    def test_example_3_raises_value_error(self):
        with self.assertRaises(ValueError) as caught:
            crafting(
                ["oak_planks 4 oak_log", "book many paper paper paper leather"],
                ["oak_log"],
            )
        self.assertIs(type(caught.exception), ValueError,
                      "Raise ValueError itself, not a subclass.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("solution", nargs="?", default="solution.py",
                        help="Python file containing your crafting function")
    args = parser.parse_args()
    crafting = runpy.run_path(args.solution)["crafting"]
    unittest.main(argv=[sys.argv[0]], verbosity=2)
