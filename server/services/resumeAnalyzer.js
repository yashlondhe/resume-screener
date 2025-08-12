const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const OpenAI = require('openai');
const industryAnalyzer = require('./industryAnalyzer');
const atsChecker = require('./atsChecker');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class ResumeAnalyzer {
  async extractTextFromFile(file) {
    const buffer = fs.readFileSync(file.path);
    
    if (file.mimetype === 'application/pdf') {
      const data = await pdf(buffer);
      return data.text;
    } else if (file.mimetype === 'application/msword' || 
               file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    
    throw new Error('Unsupported file type');
  }

  calculateBasicMetrics(text) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const characters = text.length;
    
    // Estimate pages (assuming ~500 words per page)
    const estimatedPages = Math.ceil(words.length / 500);
    
    // Check for common resume sections
    const sections = {
      contact: /contact|email|phone|address/i.test(text),
      experience: /experience|work|employment|job/i.test(text),
      education: /education|degree|university|college|school/i.test(text),
      skills: /skills|technical|programming|software/i.test(text),
      summary: /summary|objective|profile/i.test(text)
    };
    
    // Check for formatting indicators
    const formatting = {
      hasBulletPoints: /[•·▪▫‣⁃]/g.test(text) || /^\s*[-*+]\s/gm.test(text),
      hasNumbers: /\d/.test(text),
      hasEmails: /@/.test(text),
      hasPhones: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text)
    };
    
    return {
      wordCount: words.length,
      lineCount: lines.length,
      characterCount: characters,
      estimatedPages,
      sections,
      formatting
    };
  }

  async analyzeWithAI(text, metrics, industryAnalysis) {
    if (!process.env.OPENAI_API_KEY) {
      // Fallback analysis without AI
      return this.fallbackAnalysis(text, metrics, industryAnalysis);
    }

    try {
      const prompt = `
Analyze this resume for the ${industryAnalysis.industryName} industry and provide a detailed evaluation. Rate it out of 10 and provide specific feedback.

Industry Context: ${industryAnalysis.industryName}
Required Sections: ${industryAnalysis.sectionsRequired.join(', ')}
Critical Skills: ${industryAnalysis.criticalSkillsRequired.join(', ')}

Resume Text:
${text.substring(0, 4000)} ${text.length > 4000 ? '...' : ''}

Please evaluate based on:
1. Content Quality (relevant experience, achievements, skills for ${industryAnalysis.industryName})
2. Structure & Organization (clear sections, logical flow)
3. Formatting & Presentation (professional appearance, readability)
4. Industry Alignment (${industryAnalysis.industryName}-specific requirements)
5. Length Appropriateness (optimal page count for ${industryAnalysis.industryName})

Consider these industry-specific factors:
- Industry keywords found: ${industryAnalysis.industryKeywordsFound.join(', ')}
- Critical skills present: ${industryAnalysis.criticalSkillsFound.join(', ')}
- Required sections found: ${industryAnalysis.sectionsFound.join(', ')}

Provide your response in this JSON format:
{
  "overallScore": number (1-10),
  "scores": {
    "content": number (1-10),
    "structure": number (1-10),
    "formatting": number (1-10),
    "industryAlignment": number (1-10),
    "length": number (1-10)
  },
  "feedback": {
    "strengths": ["strength1", "strength2"],
    "improvements": ["improvement1", "improvement2"],
    "industrySpecific": ["industry tip1", "industry tip2"],
    "summary": "brief overall assessment"
  }
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      return analysis;
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.fallbackAnalysis(text, metrics, industryAnalysis);
    }
  }

  fallbackAnalysis(text, metrics, industryAnalysis) {
    // Enhanced rule-based analysis with industry considerations
    let contentScore = 5;
    let structureScore = 5;
    let formattingScore = 5;
    let industryAlignmentScore = 5;
    let lengthScore = 5;

    // Content scoring with industry boost
    if (metrics.wordCount > 200) contentScore += 1;
    if (metrics.wordCount > 400) contentScore += 1;
    if (/\d+\s*(years?|months?)/i.test(text)) contentScore += 1;
    if (/(achieved|improved|increased|reduced|managed|led)/i.test(text)) contentScore += 1;

    // Industry alignment scoring
    const industryKeywordRatio = industryAnalysis.industryKeywordsFound.length / 
                                Math.max(1, industryAnalysis.industryKeywordsTotal);
    industryAlignmentScore = Math.min(10, 3 + Math.round(industryKeywordRatio * 7));

    // Critical skills bonus
    if (industryAnalysis.criticalSkillsFound.length > 0) {
      industryAlignmentScore += Math.min(2, industryAnalysis.criticalSkillsFound.length);
    }

    // Structure scoring with industry requirements
    const sectionCount = Object.values(metrics.sections).filter(Boolean).length;
    structureScore = Math.min(10, 3 + sectionCount);
    
    // Bonus for having required industry sections
    const requiredSectionsFound = industryAnalysis.sectionsFound.length;
    const requiredSectionsTotal = industryAnalysis.sectionsRequired.length;
    if (requiredSectionsFound >= requiredSectionsTotal) {
      structureScore += 1;
    }

    // Formatting scoring
    if (metrics.formatting.hasBulletPoints) formattingScore += 1;
    if (metrics.formatting.hasEmails) formattingScore += 1;
    if (metrics.formatting.hasPhones) formattingScore += 1;
    if (metrics.formatting.hasNumbers) formattingScore += 1;

    // Industry-specific length scoring
    const recommendedLength = industryAnalysis.recommendedLength;
    if (metrics.estimatedPages >= recommendedLength.min && 
        metrics.estimatedPages <= recommendedLength.max) {
      lengthScore = 9;
    } else if (metrics.estimatedPages === recommendedLength.max + 1) {
      lengthScore = 7;
    } else if (metrics.estimatedPages > recommendedLength.max + 1) {
      lengthScore = 4;
    }

    // Apply industry-specific scoring weights
    const scores = {
      content: Math.min(10, contentScore),
      structure: Math.min(10, structureScore),
      formatting: Math.min(10, formattingScore),
      industryAlignment: Math.min(10, industryAlignmentScore),
      length: lengthScore
    };

    const overallScore = industryAnalyzer.calculateIndustryScore(scores, industryAnalysis);

    // Generate enhanced feedback
    const industryFeedback = industryAnalyzer.generateIndustryFeedback(industryAnalysis);

    return {
      overallScore: overallScore.industryAdjustedOverall || Math.round(Object.values(scores).reduce((a, b) => a + b) / 5),
      scores: scores,
      feedback: {
        strengths: [...this.generateStrengths(metrics), ...industryFeedback.strengths],
        improvements: [...this.generateImprovements(metrics), ...industryFeedback.improvements],
        industrySpecific: industryFeedback.industrySpecific,
        summary: `Resume scored for ${industryAnalysis.industryName} industry. ${metrics.estimatedPages} page(s) with ${metrics.wordCount} words.`
      }
    };
  }

  generateStrengths(metrics) {
    const strengths = [];
    if (metrics.sections.experience) strengths.push("Includes work experience section");
    if (metrics.sections.education) strengths.push("Contains education information");
    if (metrics.sections.skills) strengths.push("Lists relevant skills");
    if (metrics.formatting.hasBulletPoints) strengths.push("Uses bullet points for readability");
    if (metrics.estimatedPages <= 2) strengths.push("Appropriate length");
    return strengths;
  }

  generateImprovements(metrics) {
    const improvements = [];
    if (!metrics.sections.summary) improvements.push("Consider adding a professional summary");
    if (!metrics.sections.skills) improvements.push("Add a skills section");
    if (!metrics.formatting.hasBulletPoints) improvements.push("Use bullet points to improve readability");
    if (metrics.estimatedPages > 2) improvements.push("Consider reducing length to 1-2 pages");
    if (metrics.wordCount < 200) improvements.push("Expand content with more details");
    return improvements;
  }

  async analyzeResume(file) {
    try {
      // Extract text from file
      const text = await this.extractTextFromFile(file);
      
      // Calculate basic metrics
      const metrics = this.calculateBasicMetrics(text);
      
      // Detect industry and get industry-specific analysis
      const detectedIndustry = industryAnalyzer.detectIndustry(text);
      const industryAnalysis = industryAnalyzer.analyzeIndustryFit(text, detectedIndustry);
      
      // Perform AI analysis with industry context
      const analysis = await this.analyzeWithAI(text, metrics, industryAnalysis);
      
      // Check ATS compatibility
      const atsCompatibility = atsChecker.checkATSCompatibility(text, metrics);
      
      return {
        ...analysis,
        metrics: {
          wordCount: metrics.wordCount,
          estimatedPages: metrics.estimatedPages,
          sectionsFound: Object.keys(metrics.sections).filter(key => metrics.sections[key])
        },
        industryAnalysis: {
          detectedIndustry: industryAnalysis.industryMatch,
          industryName: industryAnalysis.industryName,
          industryKeywordsFound: industryAnalysis.industryKeywordsFound.length,
          criticalSkillsFound: industryAnalysis.criticalSkillsFound.length,
          sectionsAlignment: `${industryAnalysis.sectionsFound.length}/${industryAnalysis.sectionsRequired.length}`,
          recommendedLength: industryAnalysis.recommendedLength
        },
        atsCompatibility: {
          score: atsCompatibility.score,
          isATSFriendly: atsCompatibility.isATSFriendly,
          summary: atsChecker.generateATSSummary(atsCompatibility),
          recommendations: atsCompatibility.recommendations.slice(0, 3), // Top 3 recommendations
          detailedChecks: atsCompatibility.checks
        }
      };
    } catch (error) {
      throw new Error(`Resume analysis failed: ${error.message}`);
    }
  }
}

module.exports = new ResumeAnalyzer();
