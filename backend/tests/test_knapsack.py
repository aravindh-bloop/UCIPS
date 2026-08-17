from types import SimpleNamespace

from app.services.knapsack import optimize_budget


def _project(cost: float, priority: float):
    return SimpleNamespace(estimated_cost=cost, priority_score=priority)


def test_zero_budget_selects_nothing():
    projects = [_project(100_000, 5.0), _project(200_000, 8.0)]
    result = optimize_budget(projects, 0)
    assert result["selected"] == []
    assert result["excluded"] == projects
    assert result["total_cost"] == 0
    assert result["total_expected_impact"] == 0


def test_single_affordable_item_is_selected():
    projects = [_project(100_000, 5.0)]
    result = optimize_budget(projects, 200_000)
    assert result["selected"] == projects
    assert result["total_cost"] == 100_000
    assert result["total_expected_impact"] == 5.0


def test_too_expensive_item_is_excluded():
    projects = [_project(500_000, 9.0)]
    result = optimize_budget(projects, 100_000)
    assert result["selected"] == []
    assert result["excluded"] == projects


def test_optimal_combination_beats_naive_greedy_by_density():
    # cheap = best value/cost ratio, expensive = highest absolute value but worse ratio.
    # A greedy-by-density approach picks {cheap, medium} = 6.5 + 7.62 = 14.12 and stops
    # (nothing else fits). The true DP optimum is {cheap, expensive} = 6.5 + 8.97 = 15.47,
    # which also fits the budget and has higher total value.
    cheap = _project(690_000, 6.5)
    medium = _project(1_080_000, 7.62)
    expensive = _project(4_375_000, 8.97)
    projects = [expensive, medium, cheap]

    result = optimize_budget(projects, 5_080_000)

    assert set(id(p) for p in result["selected"]) == {id(cheap), id(expensive)}
    assert result["total_expected_impact"] == 15.47
    assert result["total_cost"] == 5_065_000


def test_budget_covering_everything_selects_all():
    projects = [_project(100_000, 3.0), _project(200_000, 4.0), _project(50_000, 1.0)]
    result = optimize_budget(projects, 10_000_000)
    assert set(id(p) for p in result["selected"]) == {id(p) for p in projects}
    assert result["excluded"] == []
