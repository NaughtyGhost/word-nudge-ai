import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, text, context, prompt } = await req.json();
    console.log('AI Writer request:', { action, textLength: text?.length, contextLength: context?.length });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    // Editorial analysis actions
    if (action.startsWith('editor-')) {
      const analysisType = action.replace('editor-', '');
      
      switch (analysisType) {
        case 'plot':
          systemPrompt = 'You are an experienced book editor specializing in plot structure and narrative consistency. Provide detailed, constructive feedback on plot elements, pacing, and story structure.';
          userPrompt = `Please analyze the plot of this manuscript. Focus on:\n- Plot consistency and logic\n- Story structure and arc\n- Pacing and tension\n- Plot holes or inconsistencies\n- Narrative flow\n\nManuscript:\n${text}`;
          break;
        case 'characters':
          systemPrompt = 'You are an experienced book editor specializing in character development. Provide detailed, constructive feedback on character arcs, consistency, and depth.';
          userPrompt = `Please analyze the characters in this manuscript. Focus on:\n- Character development and arcs\n- Character consistency\n- Dialogue authenticity\n- Character motivations\n- Relationships between characters\n\nManuscript:\n${text}`;
          break;
        case 'pacing':
          systemPrompt = 'You are an experienced book editor specializing in narrative pacing and flow. Provide detailed, constructive feedback on pacing, rhythm, and reader engagement.';
          userPrompt = `Please analyze the pacing of this manuscript. Focus on:\n- Overall pacing and rhythm\n- Scene transitions\n- Tension and release\n- Reader engagement\n- Areas that feel rushed or slow\n\nManuscript:\n${text}`;
          break;
        case 'style-consistency':
          systemPrompt = 'You are an experienced book editor specializing in writing style and narrative voice. Provide detailed analysis of style consistency across chapters.';
          userPrompt = `Please analyze the writing style consistency of this manuscript. Focus on:\n- Style consistency across chapters\n- Narrative voice stability\n- Prose quality and rhythm\n- Tense and perspective consistency\n- Vocabulary and language patterns\n- Areas where style shifts unexpectedly\n- Recommendations for maintaining consistent voice\n\nManuscript:\n${text}`;
          break;
        case 'voice-consistency':
          systemPrompt = 'You are an experienced book editor specializing in character voice and dialogue. Analyze how consistently each character maintains their unique voice throughout the manuscript.';
          userPrompt = `Please analyze character voice consistency in this manuscript. Focus on:\n- Each character's unique speech patterns\n- Dialogue authenticity per character\n- Voice consistency throughout chapters\n- Character-specific vocabulary and expressions\n- Areas where characters sound too similar\n- Recommendations for strengthening distinct voices\n\nManuscript:\n${text}`;
          break;
        case 'tone-mood':
          systemPrompt = 'You are an experienced book editor specializing in tone, atmosphere, and emotional resonance. Analyze the emotional landscape and mood of the manuscript.';
          userPrompt = `Please analyze the tone and mood of this manuscript. Focus on:\n- Overall tone and atmosphere\n- Mood consistency and intentional shifts\n- Emotional pacing and impact\n- Tonal appropriateness for genre\n- Areas where tone feels inconsistent\n- Suggestions for enhancing mood and atmosphere\n- Emotional highs and lows throughout the narrative\n\nManuscript:\n${text}`;
          break;
        case 'grammar-style':
          systemPrompt = 'You are an experienced copy editor and style expert. Provide comprehensive grammar, punctuation, and style improvement suggestions while respecting the author\'s voice.';
          userPrompt = `Please analyze grammar and style in this manuscript. Focus on:\n- Grammar and punctuation errors\n- Sentence structure variety\n- Word choice and precision\n- Clarity and conciseness\n- Common writing issues (passive voice, weak verbs, etc.)\n- Style improvements that maintain author's voice\n- Readability and flow\n\nProvide specific examples and actionable suggestions.\n\nManuscript:\n${text}`;
          break;
        case 'overall':
          systemPrompt = 'You are an experienced book editor providing comprehensive editorial feedback. Provide detailed, constructive feedback covering all aspects of the manuscript.';
          userPrompt = `Please provide comprehensive editorial feedback on this manuscript. Cover:\n- Strengths and weaknesses\n- Plot and structure\n- Character development\n- Writing style and voice\n- Pacing and flow\n- Suggestions for improvement\n\nManuscript:\n${text}`;
          break;
        default:
          throw new Error('Invalid editor action');
      }
    } else {
      // Writing assistant actions
      switch (action) {
        case 'autocomplete':
          systemPrompt = 'You are a creative writing assistant for novelists. Continue the story naturally in the author\'s style. Write 1-2 sentences that flow seamlessly from the context.';
          userPrompt = `Context:\n${context}\n\nContinue writing from here naturally:`;
          break;
        
        case 'rewrite-suspenseful':
          systemPrompt = 'You are a creative writing expert. Rewrite the given text to be more suspenseful, adding tension and intrigue.';
          userPrompt = `Rewrite this to be more suspenseful:\n\n${text}`;
          break;
        
        case 'rewrite-show':
          systemPrompt = 'You are a creative writing expert. Rewrite the given text using "show, don\'t tell" technique - use sensory details and actions instead of stating emotions directly.';
          userPrompt = `Rewrite this using "show, don't tell":\n\n${text}`;
          break;
        
        case 'rewrite-dialogue':
          systemPrompt = 'You are a creative writing expert. Rewrite the dialogue to be more natural, authentic, and character-driven.';
          userPrompt = `Make this dialogue more natural:\n\n${text}`;
          break;
        
        case 'generate-scene':
          systemPrompt = 'You are a creative writing assistant. Generate vivid, atmospheric scene descriptions based on prompts. Write 2-3 paragraphs.';
          userPrompt = prompt || 'Generate a vivid scene description';
          break;
        
        case 'summarize':
          systemPrompt = 'You are a writing assistant. Provide a concise, clear summary of the chapter highlighting key plot points and character development.';
          userPrompt = `Summarize this chapter:\n\n${text}`;
          break;
        
        case 'chat':
          systemPrompt = 'You are a creative writing coach and novel development assistant. Help the author with plot development, character arcs, world-building, pacing, themes, and any other aspect of their novel. Be encouraging, insightful, and ask thoughtful questions to help them develop their story.';
          userPrompt = prompt || text || 'Hello!';
          break;
        
        case 'generate-character':
          systemPrompt = 'You are a creative writing assistant specializing in character development. Generate detailed, nuanced character profiles that feel authentic and three-dimensional.';
          userPrompt = `Create a detailed character profile for: ${text}\n\nContext: ${context}\n\nProvide a JSON response with the following fields:
- personality: A detailed description of their traits, quirks, and behavioral patterns
- background: Their history, key life events, and how it shaped them
- description: Physical appearance and how they present themselves

Make the character feel real and multi-dimensional.`;
          break;
        
        default:
          throw new Error('Invalid action');
      }
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to continue.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    console.log('AI Writer success:', { action, resultLength: result.length });

    return new Response(
      JSON.stringify({ result }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI Writer error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
