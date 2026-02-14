import math

def calculate_simulation():
    # 1. Savollar qiyinchilik darajasi (Beta)
    # 1-savol: Oson (-2.0), 2-savol: O'rta (0.0), 3-savol: Qiyin (2.0)
    difficulties = [-2.0, 0.0, 2.0]
    
    # 2. Talaba A: Oson savollarga javob bergan (2 ta to'g'ri)
    responses_A = [1, 1, 0] 
    
    # 3. Talaba B: Qiyin savollarga javob bergan (2 ta to'g'ri)
    responses_B = [0, 1, 1]
    
    def estimate_ability(responses, diffs):
        theta = 0.0
        for _ in range(20):
            P = [1 / (1 + math.exp(-(theta - b))) for b in diffs]
            f = sum(responses) - sum(P)
            df = -sum(p * (1 - p) for p in P)
            theta -= f / df
        return theta

    ability_A = estimate_ability(responses_A, difficulties)
    ability_B = estimate_ability(responses_B, difficulties)
    
    score_A = 50 + 15 * ability_A
    score_B = 50 + 15 * ability_B
    
    print(f"Talaba A (Oson savollar): {round(score_A, 2)} ball")
    print(f"Talaba B (Qiyin savollar): {round(score_B, 2)} ball")

if __name__ == "__main__":
    calculate_simulation()
