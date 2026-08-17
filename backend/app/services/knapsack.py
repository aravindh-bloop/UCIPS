from app.db.models import Project

UNIT = 1_000  # matches the ₹1,000 rounding already applied in project_generation.py's cost
# estimates, so discretizing to this unit introduces zero rounding error for our own data
# (a coarser unit caused a real bug: a combination whose true cost fit the budget could be
# wrongly excluded because per-item rounding pushed the summed *discretized* weight over the
# unit cap even though the true summed cost did not exceed the true budget)


def optimize_budget(projects: list[Project], budget: float) -> dict:
    """Standard 0/1 knapsack via DP. Value = priority_score (the same composite score
    shown on the ranking screen, so the ranking and the optimizer stay numerically
    consistent). Cost is discretized into fixed-size units so the DP table
    (n_projects * budget_units) stays trivially small at demo scale."""
    n = len(projects)
    budget_units = max(0, int(budget // UNIT))
    weights = [max(1, round(p.estimated_cost / UNIT)) for p in projects]
    values = [p.priority_score for p in projects]

    dp = [[0.0] * (budget_units + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        w_i, v_i = weights[i - 1], values[i - 1]
        row, prev_row = dp[i], dp[i - 1]
        for w in range(budget_units + 1):
            row[w] = prev_row[w]
            if w_i <= w and prev_row[w - w_i] + v_i > row[w]:
                row[w] = prev_row[w - w_i] + v_i

    selected_idx: list[int] = []
    w = budget_units
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i - 1][w]:
            selected_idx.append(i - 1)
            w -= weights[i - 1]
    selected_idx.reverse()
    selected_set = set(selected_idx)

    selected = [projects[i] for i in selected_idx]
    excluded = [p for i, p in enumerate(projects) if i not in selected_set]

    return {
        "selected": selected,
        "excluded": excluded,
        "total_cost": round(sum(p.estimated_cost for p in selected), 2),
        "total_expected_impact": round(sum(p.priority_score for p in selected), 2),
    }
