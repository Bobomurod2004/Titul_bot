import unittest
import math
from rasch_service import (
    estimate_item_difficulty, 
    estimate_student_ability, 
    scale_logit
)

class TestRaschModel(unittest.TestCase):
    def test_item_difficulty_easy(self):
        # 90% correct
        responses = [1] * 9 + [0]
        difficulty = estimate_item_difficulty(responses)
        self.assertLess(difficulty, 0) # Easy items have negative difficulty
        
    def test_item_difficulty_hard(self):
        # 10% correct
        responses = [1] + [0] * 9
        difficulty = estimate_item_difficulty(responses)
        self.assertGreater(difficulty, 0) # Hard items have positive difficulty

    def test_student_ability_low(self):
        # Correct on easy, wrong on hard
        difficulties = [-2.0, 0.0, 2.0]
        responses = [1, 0, 0]
        ability = estimate_student_ability(responses, difficulties)
        self.assertLess(ability, 0)

    def test_student_ability_high(self):
        # Correct on all
        difficulties = [-2.0, 0.0, 2.0]
        responses = [1, 1, 1]
        ability = estimate_student_ability(responses, difficulties)
        self.assertGreater(ability, 2.0)

    def test_scale_logit(self):
        # Logit 0 should be around Mean (50)
        self.assertEqual(scale_logit(0.0), 50.0)
        # Higher logit should be higher score
        self.assertGreater(scale_logit(1.0), 50.0)
        # Clipping at 100
        self.assertEqual(scale_logit(10.0), 100.0)

if __name__ == '__main__':
    unittest.main()
