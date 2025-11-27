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
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('Lovable API key not configured');
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

    const systemPrompt = `You are an AI COO analyzing employee performance. Based on the metrics provided, analyze the employee's performance and provide structured feedback.

Be direct and constructive. If it's a system or external blocker, make it clear it's NOT the employee's fault.

Respond in ${language} language.`;

    const userPrompt = `Analyze this employee:
Name: ${teamMemberName}
Role: ${role}
Metrics: ${JSON.stringify(metrics)}
Notes: ${notes || 'None'}

Provide:
1. Score: green (exceeding expectations), yellow (needs attention), or red (critical issue)
2. Blocker type: NONE, EMPLOYEE (staff issue), SYSTEM (infrastructure problem), or EXTERNAL (outside factors)
3. Clear reason for the score (2-3 sentences)
4. Direct message to the employee (2-3 sentences)
5. Next step recommendation for CEO`;

    console.log('Calling Lovable AI...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_performance",
              description: "Analyze employee performance and provide structured feedback",
              parameters: {
                type: "object",
                properties: {
                  score: {
                    type: "string",
                    enum: ["green", "yellow", "red"],
                    description: "Performance score"
                  },
                  blocker: {
                    type: "string",
                    enum: ["NONE", "EMPLOYEE", "SYSTEM", "EXTERNAL"],
                    description: "Type of blocker affecting performance"
                  },
                  reason: {
                    type: "string",
                    description: "Clear explanation for the score (2-3 sentences)"
                  },
                  message: {
                    type: "string",
                    description: "Direct message to the employee (2-3 sentences)"
                  },
                  nextStep: {
                    type: "string",
                    description: "Recommended next step for CEO"
                  }
                },
                required: ["score", "blocker", "reason", "message", "nextStep"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_performance" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to your workspace.');
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Response received:', JSON.stringify(data));
    
    // Extract structured output from tool call
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function || !toolCall.function.arguments) {
      console.error('No tool call in response:', JSON.stringify(data));
      throw new Error('Failed to get structured analysis from AI');
    }
    
    const analysis = JSON.parse(toolCall.function.arguments);

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