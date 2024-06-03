const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const CSV_DIR = "dataset.csv";

function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => {
        resolve(results);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

_sanitizeTimeSeries = (keywords) => {
  return keywords.map((item) => {
    return {
      ...item,
      time_series: item.time_series
        .replace(/'/g, "") // Remove single quotes
        .split(",")
        .map(Number), // Convert each element to a number
    };
  });
};

const filePath = path.resolve(__dirname, CSV_DIR);

// Function to identify peaks and score seasonality
const _scoreYearlySeasonalityByProeminanceOfPeak = (yearlyData) => {
  const yearlyScores = [];

  yearlyData.forEach((yearData) => {
    let maxSearches = 0;
    let secondMaxSearches = 0;

    yearData.forEach((searches) => {
      if (searches > maxSearches) {
        secondMaxSearches = maxSearches;
        maxSearches = searches;
      } else if (searches > secondMaxSearches) {
        secondMaxSearches = searches;
      }
    });

    // Calculate the seasonality score based on the prominence of the peak
    const prominence = maxSearches - secondMaxSearches;
    yearlyScores.push(prominence);
  });

  return yearlyScores;
};

const _calculateAverageSeasonality = (seasonalityScores) => {
  const totalProminence = seasonalityScores.reduce(
    (acc, score) => acc + score,
    0
  );
  return totalProminence / seasonalityScores.length;
};

const _splitYears = (timeSeries) => {
  const yearlyData = [];
  for (let i = 0; i < timeSeries.length; i += 52) {
    yearlyData.push(timeSeries.slice(i, i + 52));
  }

  return yearlyData;
};

const _processKeywordsSeasonality = (keywordsData) => {
  const results = [];

  keywordsData.forEach(({ keyword, time_series }) => {
    let yearlyData = _splitYears(time_series);

    const seasonalityScores = _scoreYearlySeasonalityByProeminanceOfPeak(yearlyData);
    const averageSeasonality = _calculateAverageSeasonality(seasonalityScores);

    results.push({ keyword, averageSeasonality });
  });

  return results;
};

const _printOrderedKeywordsBySeasonality = (keywordsData) => {
  const seasonalityResults = _processKeywordsSeasonality(keywordsData);

  // Sort results by avg seasonality in descending order
  seasonalityResults.sort(
    (a, b) => b.averageSeasonality - a.averageSeasonality
  );

  console.log('Keywords ordered by most to least seasonal:');
  seasonalityResults.forEach(({ keyword, averageSeasonality }) => {
    console.log(
      `Keyword: ${keyword}, Avg Seasonality Score: ${averageSeasonality}`
    );
  });
};

readCSV(filePath)
  .then((keywords) => {
    keywords = _sanitizeTimeSeries(keywords);
    _printOrderedKeywordsBySeasonality(keywords);
  })
  .catch((err) => {
    console.error("Error reading CSV file:", err);
  });

