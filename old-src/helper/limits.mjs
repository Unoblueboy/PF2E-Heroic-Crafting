export const HEROIC_CRAFTING_SPENDING_LIMIT = {
	1: { hour: 30, day: 120, week: 600 },
	2: { hour: 50, day: 200, week: 1000 },
	3: { hour: 80, day: 320, week: 1600 },
	4: { hour: 150, day: 600, week: 3000 },
	5: { hour: 200, day: 800, week: 4000 },
	6: { hour: 300, day: 1200, week: 6000 },
	7: { hour: 500, day: 2000, week: 10000 },
	8: { hour: 700, day: 2800, week: 14000 },
	9: { hour: 1000, day: 4000, week: 20000 },
	10: { hour: 1500, day: 6000, week: 30000 },
	11: { hour: 2100, day: 8400, week: 42000 },
	12: { hour: 3000, day: 12000, week: 60000 },
	13: { hour: 4000, day: 16000, week: 80000 },
	14: { hour: 7000, day: 28000, week: 140000 },
	15: { hour: 10000, day: 40000, week: 200000 },
	16: { hour: 12500, day: 50000, week: 250000 },
	17: { hour: 20000, day: 80000, week: 400000 },
	18: { hour: 30000, day: 120000, week: 600000 },
	19: { hour: 50000, day: 200000, week: 1000000 },
	20: { hour: 80000, day: 320000, week: 1600000 },
}; // prices are in CP

export const HEROIC_CRAFTING_GATHERED_INCOME = [
	10, // Level 0
	40, // Level 1
	60, // Level 2
	100, // Level 3
	160, // Level 4
	200, // Level 5
	400, // Level 6
	500, // Level 7
	600, // Level 8
	800, // Level 9
	1000, // Level 10
	1200, // Level 11
	1600, // Level 12
	2400, // Level 13
	3000, // Level 14
	4000, // Level 15
	6000, // Level 16
	8000, // Level 17
	14000, // Level 18
	20000, // Level 19
	30000, // Level 20
]; // prices are in CP

export const LEVEL_BASED_DC = new Map([
	[-1, 13],
	[0, 14],
	[1, 15],
	[2, 16],
	[3, 18],
	[4, 19],
	[5, 20],
	[6, 22],
	[7, 23],
	[8, 24],
	[9, 26],
	[10, 27],
	[11, 28],
	[12, 30],
	[13, 31],
	[14, 32],
	[15, 34],
	[16, 35],
	[17, 36],
	[18, 38],
	[19, 39],
	[20, 40],
	[21, 42],
	[22, 44],
	[23, 46],
	[24, 48],
	[25, 50],
]);
