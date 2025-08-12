class ATSChecker {
  checkATSCompatibility(text, metrics) {
    const checks = {
      formatting: this.checkFormatting(text),
      keywords: this.checkKeywords(text),
      structure: this.checkStructure(text, metrics),
      readability: this.checkReadability(text, metrics),
      fileFormat: this.checkFileFormat()
    };

    const overallScore = this.calculateATSScore(checks);
    
    return {
      score: overallScore,
      checks: checks,
      recommendations: this.generateATSRecommendations(checks),
      isATSFriendly: overallScore >= 7
    };
  }

  checkFormatting(text) {
    const issues = [];
    const score = { value: 10, issues: [] };

    // Check for problematic formatting
    if (/[^\x00-\x7F]/.test(text)) {
      score.value -= 1;
      score.issues.push('Contains special characters that may not parse correctly');
    }

    // Check for tables (common ATS issue)
    if (/\t{2,}|\s{4,}/.test(text)) {
      score.value -= 1;
      score.issues.push('May contain table formatting that ATS cannot read');
    }

    // Check for excessive formatting symbols
    const formattingSymbols = (text.match(/[•▪▫‣⁃◦]/g) || []).length;
    if (formattingSymbols > 20) {
      score.value -= 1;
      score.issues.push('Excessive use of special bullet points');
    }

    // Check for headers and footers indicators
    if (/page \d+ of \d+|confidential|proprietary/i.test(text)) {
      score.value -= 1;
      score.issues.push('May contain headers/footers that confuse ATS');
    }

    return {
      score: Math.max(1, score.value),
      issues: score.issues,
      passed: score.value >= 8
    };
  }

  checkKeywords(text) {
    const textLower = text.toLowerCase();
    const commonKeywords = [
      'experience', 'skills', 'education', 'work', 'job', 'company',
      'project', 'team', 'management', 'development', 'analysis'
    ];

    const foundKeywords = commonKeywords.filter(keyword => 
      textLower.includes(keyword)
    );

    const keywordDensity = foundKeywords.length / commonKeywords.length;
    let score = Math.round(keywordDensity * 10);

    const issues = [];
    if (keywordDensity < 0.3) {
      issues.push('Low keyword density - add more industry-relevant terms');
    }

    // Check for keyword stuffing
    const wordCount = text.split(/\s+/).length;
    const totalKeywordOccurrences = commonKeywords.reduce((count, keyword) => {
      const matches = (textLower.match(new RegExp(keyword, 'g')) || []).length;
      return count + matches;
    }, 0);

    if (totalKeywordOccurrences / wordCount > 0.1) {
      score -= 2;
      issues.push('Possible keyword stuffing detected');
    }

    return {
      score: Math.max(1, Math.min(10, score)),
      keywordDensity: keywordDensity,
      foundKeywords: foundKeywords.length,
      totalKeywords: commonKeywords.length,
      issues: issues,
      passed: score >= 6
    };
  }

  checkStructure(text, metrics) {
    const issues = [];
    let score = 10;

    // Check for clear sections
    const sectionHeaders = [
      /summary|objective|profile/i,
      /experience|employment|work history/i,
      /education|academic/i,
      /skills|competencies|technical/i,
      /contact|personal information/i
    ];

    const foundSections = sectionHeaders.filter(pattern => pattern.test(text));
    
    if (foundSections.length < 3) {
      score -= 2;
      issues.push('Missing clear section headers');
    }

    // Check for consistent formatting
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const shortLines = lines.filter(line => line.trim().length < 50).length;
    const longLines = lines.filter(line => line.trim().length > 100).length;

    if (shortLines / lines.length > 0.6) {
      score -= 1;
      issues.push('Too many short lines may indicate poor structure');
    }

    // Check for chronological order indicators
    const yearPattern = /\b(19|20)\d{2}\b/g;
    const years = (text.match(yearPattern) || []).map(year => parseInt(year));
    
    if (years.length >= 2) {
      const sortedYears = [...years].sort((a, b) => b - a);
      const isChronological = JSON.stringify(years.slice(0, sortedYears.length)) === JSON.stringify(sortedYears);
      
      if (!isChronological) {
        score -= 1;
        issues.push('Consider reverse chronological order for work experience');
      }
    }

    return {
      score: Math.max(1, score),
      sectionsFound: foundSections.length,
      sectionsExpected: sectionHeaders.length,
      issues: issues,
      passed: score >= 7
    };
  }

  checkReadability(text, metrics) {
    let score = 10;
    const issues = [];

    // Check sentence length
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, sentence) => {
      return sum + sentence.split(/\s+/).length;
    }, 0) / sentences.length;

    if (avgSentenceLength > 25) {
      score -= 1;
      issues.push('Sentences may be too long for ATS parsing');
    }

    // Check for action verbs
    const actionVerbs = [
      'achieved', 'managed', 'led', 'developed', 'created', 'implemented',
      'improved', 'increased', 'reduced', 'optimized', 'designed', 'built'
    ];
    
    const foundActionVerbs = actionVerbs.filter(verb => 
      new RegExp(`\\b${verb}`, 'i').test(text)
    );

    if (foundActionVerbs.length < 3) {
      score -= 1;
      issues.push('Add more action verbs to describe achievements');
    }

    // Check for quantifiable achievements
    const numberPattern = /\b\d+([.,]\d+)?(%|k|million|billion|dollars?|\$)?\b/g;
    const numbers = (text.match(numberPattern) || []).length;
    
    if (numbers < 3) {
      score -= 1;
      issues.push('Include more quantifiable achievements and metrics');
    }

    return {
      score: Math.max(1, score),
      avgSentenceLength: Math.round(avgSentenceLength),
      actionVerbsFound: foundActionVerbs.length,
      quantifiableMetrics: numbers,
      issues: issues,
      passed: score >= 7
    };
  }

  checkFileFormat() {
    // This would be enhanced based on the actual file type received
    return {
      score: 8, // Assuming PDF/DOC which are generally ATS-friendly
      format: 'PDF/DOC',
      issues: [],
      passed: true,
      recommendation: 'PDF and DOC formats are generally ATS-friendly'
    };
  }

  calculateATSScore(checks) {
    const weights = {
      formatting: 0.25,
      keywords: 0.25,
      structure: 0.25,
      readability: 0.20,
      fileFormat: 0.05
    };

    let weightedScore = 0;
    Object.keys(weights).forEach(category => {
      weightedScore += checks[category].score * weights[category];
    });

    return Math.round(weightedScore);
  }

  generateATSRecommendations(checks) {
    const recommendations = [];

    // Formatting recommendations
    if (!checks.formatting.passed) {
      recommendations.push({
        category: 'Formatting',
        priority: 'High',
        suggestions: [
          'Use simple, clean formatting without tables or complex layouts',
          'Avoid special characters and symbols',
          'Use standard fonts like Arial, Calibri, or Times New Roman'
        ]
      });
    }

    // Keyword recommendations
    if (!checks.keywords.passed) {
      recommendations.push({
        category: 'Keywords',
        priority: 'High',
        suggestions: [
          'Include more industry-specific keywords from job descriptions',
          'Use both acronyms and full terms (e.g., "AI" and "Artificial Intelligence")',
          'Naturally integrate keywords throughout your experience descriptions'
        ]
      });
    }

    // Structure recommendations
    if (!checks.structure.passed) {
      recommendations.push({
        category: 'Structure',
        priority: 'Medium',
        suggestions: [
          'Use clear section headers (Experience, Education, Skills)',
          'Organize experience in reverse chronological order',
          'Use consistent formatting for dates and job titles'
        ]
      });
    }

    // Readability recommendations
    if (!checks.readability.passed) {
      recommendations.push({
        category: 'Content',
        priority: 'Medium',
        suggestions: [
          'Start bullet points with strong action verbs',
          'Include specific numbers and metrics to quantify achievements',
          'Keep sentences concise and focused'
        ]
      });
    }

    // General ATS tips
    recommendations.push({
      category: 'General ATS Tips',
      priority: 'Low',
      suggestions: [
        'Save resume as both PDF and Word document versions',
        'Use standard section headings that ATS systems recognize',
        'Avoid images, graphics, and fancy formatting',
        'Include a skills section with relevant keywords',
        'Spell out abbreviations at least once'
      ]
    });

    return recommendations;
  }

  generateATSSummary(atsResult) {
    const { score, isATSFriendly, checks } = atsResult;
    
    let summary = `ATS Compatibility Score: ${score}/10 - `;
    
    if (score >= 8) {
      summary += 'Excellent ATS compatibility. Your resume should parse well in most systems.';
    } else if (score >= 6) {
      summary += 'Good ATS compatibility with room for improvement.';
    } else if (score >= 4) {
      summary += 'Fair ATS compatibility. Consider making recommended changes.';
    } else {
      summary += 'Poor ATS compatibility. Significant improvements needed.';
    }

    const passedChecks = Object.values(checks).filter(check => check.passed).length;
    const totalChecks = Object.keys(checks).length;
    
    summary += ` Passed ${passedChecks}/${totalChecks} ATS compatibility checks.`;

    return summary;
  }
}

module.exports = new ATSChecker();
