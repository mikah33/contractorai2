import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// RSS Feed sources for construction news
const NEWS_SOURCES = [
  {
    name: "Construction Dive",
    rssUrl: "https://www.constructiondive.com/feeds/news/",
    category: "industry"
  },
  {
    name: "For Construction Pros",
    rssUrl: "https://www.forconstructionpros.com/rss",
    category: "industry"
  },
  {
    name: "Builder Magazine",
    rssUrl: "https://www.builderonline.com/rss",
    category: "residential"
  },
  {
    name: "ENR",
    rssUrl: "https://www.enr.com/rss/news",
    category: "engineering"
  }
];

// Backup: Google News RSS for construction
const GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q=construction+contractor+building+industry&hl=en-US&gl=US&ceid=US:en";

interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  thumbnail?: string;
}

// Parse RSS feed XML
async function parseRSSFeed(url: string, sourceName: string): Promise<NewsItem[]> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "ContractorAI News Bot/1.0" }
    });

    if (!response.ok) {
      console.log(`Failed to fetch ${sourceName}: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const items: NewsItem[] = [];

    // Simple XML parsing for RSS items
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

    for (const itemXml of itemMatches.slice(0, 5)) { // Get top 5 from each source
      const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[1] ||
                    itemXml.match(/<title>(.*?)<\/title>/)?.[1] || "";
      const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || "";
      const description = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/)?.[1] ||
                         itemXml.match(/<description>(.*?)<\/description>/)?.[1] || "";
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
      const thumbnail = itemXml.match(/<media:thumbnail[^>]*url="([^"]+)"/)?.[1] ||
                       itemXml.match(/<enclosure[^>]*url="([^"]+)"/)?.[1] || "";

      if (title && link) {
        items.push({
          title: title.replace(/<[^>]*>/g, "").trim(),
          link: link.trim(),
          description: description.replace(/<[^>]*>/g, "").substring(0, 500).trim(),
          pubDate,
          source: sourceName,
          thumbnail
        });
      }
    }

    return items;
  } catch (error) {
    console.error(`Error fetching ${sourceName}:`, error);
    return [];
  }
}

// Generate AI summary using OpenAI
async function generateSummary(title: string, description: string, openaiKey: string): Promise<string> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Cost effective for summaries
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes construction industry news for busy contractors. Write 2-3 concise sentences that highlight the key takeaway and why it matters to contractors. Be direct and practical."
          },
          {
            role: "user",
            content: `Summarize this construction news article:\n\nTitle: ${title}\n\nDescription: ${description}`
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      console.error("OpenAI API error:", await response.text());
      return description.substring(0, 200) + "...";
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || description.substring(0, 200) + "...";
  } catch (error) {
    console.error("Error generating summary:", error);
    return description.substring(0, 200) + "...";
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching industry news from RSS feeds...");

    // Fetch from all sources
    const allNews: NewsItem[] = [];

    for (const source of NEWS_SOURCES) {
      const items = await parseRSSFeed(source.rssUrl, source.name);
      allNews.push(...items);
    }

    // Fallback to Google News if we don't have enough
    if (allNews.length < 3) {
      console.log("Using Google News fallback...");
      const googleNews = await parseRSSFeed(GOOGLE_NEWS_RSS, "Google News");
      allNews.push(...googleNews);
    }

    // Remove duplicates by title similarity and sort by date
    const uniqueNews = allNews
      .filter((item, index, self) =>
        index === self.findIndex(t =>
          t.title.toLowerCase().substring(0, 30) === item.title.toLowerCase().substring(0, 30)
        )
      )
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 5); // Keep top 5

    console.log(`Found ${uniqueNews.length} unique news items`);

    // Mark old news as inactive
    await supabase
      .from("industry_news")
      .update({ is_active: false })
      .eq("is_active", true);

    // Insert new news with AI summaries
    const insertedNews = [];

    for (const item of uniqueNews) {
      console.log(`Generating summary for: ${item.title.substring(0, 50)}...`);

      const summary = await generateSummary(item.title, item.description, openaiKey);

      const { data, error } = await supabase
        .from("industry_news")
        .insert({
          title: item.title,
          summary: summary,
          source_name: item.source,
          source_url: item.link,
          thumbnail_url: item.thumbnail || null,
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting news:", error);
      } else {
        insertedNews.push(data);
      }
    }

    console.log(`Successfully inserted ${insertedNews.length} news articles`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fetched and stored ${insertedNews.length} news articles`,
        articles: insertedNews
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("Error in fetch-industry-news:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
