import { describe, expect, it } from "vitest";
import { estimateEnergyNeeds, suggestMacros } from "./energy-calculator";

describe("estimateEnergyNeeds", () => {
  it("calculates BMR/TDEE with Mifflin-St Jeor for a male", () => {
    const result = estimateEnergyNeeds({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      sex: "male",
      activityLevel: "moderately_active",
    });

    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(result.bmr).toBe(1780);
    expect(result.activityMultiplier).toBe(1.55);
    expect(result.tdee).toBe(Math.round(1780 * 1.55));
    expect(result.estimatedCalories).toBe(result.tdee);
    expect(result.formula).toBe("mifflin_st_jeor");
  });

  it("calculates BMR with Mifflin-St Jeor for a female", () => {
    const result = estimateEnergyNeeds({
      weightKg: 65,
      heightCm: 165,
      age: 28,
      sex: "female",
      activityLevel: "sedentary",
    });

    // BMR = 10*65 + 6.25*165 - 5*28 - 161 = 650 + 1031.25 - 140 - 161 = 1380.25 -> 1380
    expect(result.bmr).toBe(1380);
  });

  it("applies a calorie deficit adjustment for weight loss", () => {
    const result = estimateEnergyNeeds({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      sex: "male",
      activityLevel: "sedentary",
      calorieAdjustment: -500,
    });

    expect(result.estimatedCalories).toBe(result.tdee - 500);
  });

  it("supports the Harris-Benedict formula as an alternative", () => {
    const result = estimateEnergyNeeds({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      sex: "male",
      activityLevel: "sedentary",
      formula: "harris_benedict",
    });

    expect(result.formula).toBe("harris_benedict");
    expect(result.bmr).not.toBe(
      estimateEnergyNeeds({
        weightKg: 80,
        heightCm: 180,
        age: 30,
        sex: "male",
        activityLevel: "sedentary",
        formula: "mifflin_st_jeor",
      }).bmr,
    );
  });

  it("never returns a negative calorie target", () => {
    const result = estimateEnergyNeeds({
      weightKg: 40,
      heightCm: 150,
      age: 80,
      sex: "female",
      activityLevel: "sedentary",
      calorieAdjustment: -5000,
    });

    expect(result.estimatedCalories).toBeGreaterThanOrEqual(0);
  });
});

describe("suggestMacros", () => {
  it("derives protein from body weight and fills remaining calories with fat/carbs", () => {
    const macros = suggestMacros(2200, 80, 1.6);

    expect(macros.proteinG).toBe(128); // 80 * 1.6
    expect(macros.fatG).toBe(Math.round((2200 * 0.3) / 9));
    // Total macro calories should roughly reconstruct the calorie target.
    const reconstructed = macros.proteinG * 4 + macros.fatG * 9 + macros.carbsG * 4;
    expect(Math.abs(reconstructed - 2200)).toBeLessThanOrEqual(4);
  });

  it("never returns negative carbs even for very low calorie targets", () => {
    const macros = suggestMacros(500, 100, 2);
    expect(macros.carbsG).toBeGreaterThanOrEqual(0);
  });
});
