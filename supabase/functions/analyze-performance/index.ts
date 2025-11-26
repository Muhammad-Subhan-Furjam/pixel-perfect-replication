import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { checkInId, teamMemberName, role, metrics, notes, language = 'en' } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const systemPrompt = `You are an AI COO analyzing employee performance. Based on the metrics provided, you will:
1. Assign a score: green (exceeding), yellow (needs attention), red (critical issue)
2. Identify blocker type: NONE, EMPLOYEE (staff issue), SYSTEM (infrastructure), or EXTERNAL
3. Provide clear reason for the score
4. Write a short, direct message to the employee (2-3 sentences)
5. Suggest next step for CEO

Be direct and constructive. If it's a system or external blocker, make it clear it's NOT the employee's fault.`;

    const userPrompt = `Analyze this employee:
Name: ${teamMemberName}
Role: ${role}
Metrics: ${JSON.stringify(metrics)}
Notes: ${notes || 'None'}

Respond in ${language} language. Provide JSON: {"score": "green|yellow|red", "blocker": "NONE|EMPLOYEE|SYSTEM|EXTERNAL", "reason": "...", "message": "...", "nextStep": "..."}`;

    console.log('Calling OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    console.log('AI Response:', analysisText);
    
    // Parse JSON from response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);

    // Save to database
    const { data: savedAnalysis, error: dbError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        check_in_id: checkInId,
        score: analysis.score,
        blocker: analysis.blocker,
        reason: analysis.reason,
        message: analysis.message,
        next_step: analysis.nextStep,
        language: language
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    return new Response(JSON.stringify(savedAnalysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-performance function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});