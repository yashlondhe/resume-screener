const industries = {
  technology: {
    name: 'Technology',
    keywords: ['software', 'programming', 'development', 'coding', 'javascript', 'python', 'java', 'react', 'node', 'database', 'api', 'cloud', 'aws', 'docker', 'kubernetes', 'agile', 'scrum'],
    requiredSections: ['skills', 'experience', 'projects'],
    scoringWeights: {
      technical_skills: 0.35,
      experience: 0.25,
      projects: 0.20,
      education: 0.10,
      certifications: 0.10
    },
    criticalSkills: ['programming languages', 'frameworks', 'databases', 'version control'],
    preferredLength: { min: 1, max: 2 }
  },
  
  finance: {
    name: 'Finance',
    keywords: ['financial', 'accounting', 'investment', 'banking', 'analysis', 'excel', 'modeling', 'risk', 'compliance', 'audit', 'cfa', 'cpa', 'bloomberg', 'trading'],
    requiredSections: ['experience', 'education', 'certifications'],
    scoringWeights: {
      experience: 0.30,
      education: 0.25,
      certifications: 0.20,
      analytical_skills: 0.15,
      achievements: 0.10
    },
    criticalSkills: ['financial analysis', 'excel', 'financial modeling', 'risk management'],
    preferredLength: { min: 1, max: 2 }
  },
  
  marketing: {
    name: 'Marketing',
    keywords: ['marketing', 'digital', 'social media', 'campaigns', 'analytics', 'seo', 'sem', 'content', 'brand', 'advertising', 'google analytics', 'facebook ads', 'hubspot'],
    requiredSections: ['experience', 'skills', 'achievements'],
    scoringWeights: {
      experience: 0.25,
      creativity: 0.20,
      digital_skills: 0.20,
      achievements: 0.20,
      education: 0.15
    },
    criticalSkills: ['digital marketing', 'analytics', 'content creation', 'campaign management'],
    preferredLength: { min: 1, max: 2 }
  },
  
  healthcare: {
    name: 'Healthcare',
    keywords: ['medical', 'healthcare', 'clinical', 'patient', 'nursing', 'physician', 'hospital', 'treatment', 'diagnosis', 'medical records', 'hipaa', 'emr'],
    requiredSections: ['education', 'certifications', 'experience'],
    scoringWeights: {
      education: 0.30,
      certifications: 0.25,
      experience: 0.25,
      clinical_skills: 0.20
    },
    criticalSkills: ['patient care', 'medical knowledge', 'clinical experience', 'certifications'],
    preferredLength: { min: 2, max: 3 }
  },
  
  sales: {
    name: 'Sales',
    keywords: ['sales', 'revenue', 'targets', 'clients', 'crm', 'negotiation', 'lead generation', 'closing', 'quota', 'pipeline', 'salesforce', 'b2b', 'b2c'],
    requiredSections: ['experience', 'achievements'],
    scoringWeights: {
      achievements: 0.35,
      experience: 0.30,
      communication: 0.20,
      skills: 0.15
    },
    criticalSkills: ['sales experience', 'client management', 'negotiation', 'crm systems'],
    preferredLength: { min: 1, max: 2 }
  },
  
  general: {
    name: 'General',
    keywords: [],
    requiredSections: ['experience', 'education'],
    scoringWeights: {
      experience: 0.30,
      education: 0.20,
      skills: 0.20,
      achievements: 0.15,
      formatting: 0.15
    },
    criticalSkills: [],
    preferredLength: { min: 1, max: 2 }
  }
};

class IndustryAnalyzer {
  detectIndustry(text) {
    const textLower = text.toLowerCase();
    let bestMatch = { industry: 'general', score: 0 };
    
    for (const [key, industry] of Object.entries(industries)) {
      if (key === 'general') continue;
      
      const matchCount = industry.keywords.filter(keyword => 
        textLower.includes(keyword.toLowerCase())
      ).length;
      
      const score = matchCount / industry.keywords.length;
      
      if (score > bestMatch.score && score > 0.1) { // At least 10% keyword match
        bestMatch = { industry: key, score };
      }
    }
    
    return bestMatch.industry;
  }
  
  getIndustryConfig(industryKey) {
    return industries[industryKey] || industries.general;
  }
  
  analyzeIndustryFit(text, industryKey) {
    const industry = this.getIndustryConfig(industryKey);
    const textLower = text.toLowerCase();
    
    // Check for required sections
    const sectionsFound = industry.requiredSections.filter(section => {
      const sectionPatterns = {
        skills: /skills|technical|competencies/i,
        experience: /experience|work|employment|job/i,
        projects: /projects|portfolio|work samples/i,
        education: /education|degree|university|college/i,
        certifications: /certification|license|credential/i,
        achievements: /achievement|accomplishment|award|recognition/i
      };
      
      return sectionPatterns[section] && sectionPatterns[section].test(text);
    });
    
    // Check for critical skills
    const criticalSkillsFound = industry.criticalSkills.filter(skill =>
      textLower.includes(skill.toLowerCase())
    );
    
    // Calculate industry-specific scores
    const industryKeywords = industry.keywords.filter(keyword =>
      textLower.includes(keyword.toLowerCase())
    );
    
    return {
      industryMatch: industryKey,
      industryName: industry.name,
      sectionsFound: sectionsFound,
      sectionsRequired: industry.requiredSections,
      criticalSkillsFound: criticalSkillsFound,
      criticalSkillsRequired: industry.criticalSkills,
      industryKeywordsFound: industryKeywords,
      industryKeywordsTotal: industry.keywords.length,
      scoringWeights: industry.scoringWeights,
      recommendedLength: industry.preferredLength
    };
  }
  
  generateIndustryFeedback(analysis) {
    const feedback = {
      strengths: [],
      improvements: [],
      industrySpecific: []
    };
    
    // Sections feedback
    if (analysis.sectionsFound.length >= analysis.sectionsRequired.length) {
      feedback.strengths.push(`Contains all required sections for ${analysis.industryName}`);
    } else {
      const missingSections = analysis.sectionsRequired.filter(
        section => !analysis.sectionsFound.includes(section)
      );
      feedback.improvements.push(`Add missing sections: ${missingSections.join(', ')}`);
    }
    
    // Critical skills feedback
    if (analysis.criticalSkillsFound.length > 0) {
      feedback.strengths.push(`Demonstrates ${analysis.criticalSkillsFound.length} critical ${analysis.industryName.toLowerCase()} skills`);
    }
    
    if (analysis.criticalSkillsFound.length < analysis.criticalSkillsRequired.length) {
      const missingSkills = analysis.criticalSkillsRequired.filter(
        skill => !analysis.criticalSkillsFound.some(found => 
          found.toLowerCase().includes(skill.toLowerCase())
        )
      );
      feedback.improvements.push(`Consider highlighting: ${missingSkills.slice(0, 3).join(', ')}`);
    }
    
    // Industry keywords feedback
    const keywordRatio = analysis.industryKeywordsFound.length / analysis.industryKeywordsTotal;
    if (keywordRatio > 0.3) {
      feedback.strengths.push(`Strong ${analysis.industryName.toLowerCase()} keyword presence`);
    } else if (keywordRatio < 0.1) {
      feedback.improvements.push(`Include more ${analysis.industryName.toLowerCase()}-specific terminology`);
    }
    
    // Industry-specific recommendations
    switch (analysis.industryMatch) {
      case 'technology':
        feedback.industrySpecific.push('Include GitHub/portfolio links if available');
        feedback.industrySpecific.push('Quantify technical achievements (performance improvements, user growth)');
        break;
      case 'finance':
        feedback.industrySpecific.push('Highlight quantifiable financial impacts');
        feedback.industrySpecific.push('Include relevant certifications (CFA, CPA, FRM)');
        break;
      case 'marketing':
        feedback.industrySpecific.push('Include campaign results and ROI metrics');
        feedback.industrySpecific.push('Mention specific marketing tools and platforms');
        break;
      case 'healthcare':
        feedback.industrySpecific.push('Emphasize patient care experience and outcomes');
        feedback.industrySpecific.push('List all relevant medical certifications');
        break;
      case 'sales':
        feedback.industrySpecific.push('Quantify sales achievements (quotas, revenue growth)');
        feedback.industrySpecific.push('Highlight client relationship management');
        break;
    }
    
    return feedback;
  }
  
  calculateIndustryScore(basicScores, industryAnalysis) {
    const weights = industryAnalysis.scoringWeights;
    const industry = industryAnalysis.industryMatch;
    
    // Adjust scores based on industry-specific criteria
    let adjustedScores = { ...basicScores };
    
    // Industry-specific adjustments
    if (industry === 'technology') {
      // Boost technical content score
      if (industryAnalysis.criticalSkillsFound.length > 2) {
        adjustedScores.content = Math.min(10, adjustedScores.content + 1);
      }
      // Penalize if too long for tech roles
      if (industryAnalysis.recommendedLength && adjustedScores.length < 7) {
        adjustedScores.length = Math.max(1, adjustedScores.length - 1);
      }
    } else if (industry === 'sales') {
      // Boost achievement-focused content
      if (industryAnalysis.industryKeywordsFound.some(kw => 
        ['quota', 'revenue', 'target', 'achievement'].includes(kw.toLowerCase())
      )) {
        adjustedScores.content = Math.min(10, adjustedScores.content + 1);
      }
    } else if (industry === 'healthcare') {
      // Allow longer resumes for healthcare
      if (adjustedScores.length < 8 && industryAnalysis.sectionsFound.length >= 3) {
        adjustedScores.length = Math.min(10, adjustedScores.length + 1);
      }
    }
    
    // Calculate weighted overall score
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const normalizedWeights = {};
    Object.keys(weights).forEach(key => {
      normalizedWeights[key] = weights[key] / totalWeight;
    });
    
    // Map basic scores to industry categories
    const mappedScores = {
      technical_skills: adjustedScores.content,
      experience: adjustedScores.structure,
      projects: adjustedScores.completeness,
      education: adjustedScores.formatting,
      certifications: adjustedScores.length,
      creativity: adjustedScores.content,
      digital_skills: adjustedScores.content,
      achievements: adjustedScores.content,
      analytical_skills: adjustedScores.structure,
      clinical_skills: adjustedScores.completeness,
      communication: adjustedScores.formatting
    };
    
    let weightedScore = 0;
    Object.keys(weights).forEach(category => {
      const score = mappedScores[category] || adjustedScores.content;
      weightedScore += score * normalizedWeights[category];
    });
    
    return {
      ...adjustedScores,
      industryAdjustedOverall: Math.round(weightedScore)
    };
  }
}

module.exports = new IndustryAnalyzer();
