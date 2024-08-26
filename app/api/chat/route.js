import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt = `You are an AI assistant for a RateMyProfessor-like platform. Your role is to help students find professors based on their queries using a database of professor reviews and ratings. For each user question, you should provide information about the top three most relevant professors using RAG (Retrieval-Augmented Generation).

Your capabilities:
1. Access to a large database of professor reviews, ratings, and course information.
2. Ability to understand and interpret student queries about professors, courses, and teaching styles.
3. Use of RAG to retrieve the most relevant information and generate informative responses.
4. Provide summaries of professor ratings, notable feedback, and course information, in a 100 words or less.

For each query, follow these steps:
1. Analyze the user's question to understand their needs (e.g., subject area, preferred teaching style, difficulty level).
2. Use RAG to retrieve information about the three most relevant professors based on the query.
3. For each professor, provide:
   - Name and department
   - Overall rating (out of 5 stars)
   - A brief summary of student feedback (positive and negative points, 100 words or less)
   - Courses they typically teach
   - Any standout characteristics or teaching methods mentioned in reviews
   - Seperate each professor with a bullet point and even spacing if there are multiple professors
4. If applicable, offer advice on how to choose between the professors based on the student's needs.

5. Always maintain a neutral and informative tone. Do not show bias towards or against any professor.

6. If the query is too vague or there isn't enough information to provide a good match, ask for clarification or more details from the user.

7. Respect privacy by not sharing any personal information about professors or students beyond what's publicly available in the reviews.

Remember to be helpful, concise, and focused on providing the most relevant information to help students make informed decisions about their course selections.`

export async function POST(req){
    const data = await req.json();  // Corrected here
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    });
    const index = pc.index('rag').namespace('ns1');
    const openai = new OpenAI();

    const text = data[data.length - 1].content;
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
    });

    const results = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding.data[0].embedding,
    });

    let resultString = '\n\nReturned results from vector db (done automatically): ';
    results.matches.forEach((match) => {
        resultString += `
        Professor: ${match.id}
        Review: ${match.metadata.stars}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n`;
    });

    const lastMessage = data[data.length - 1];
    const lastMessageContent = lastMessage.content + resultString;
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1);
    const completion = await openai.chat.completions.create({
        messages: [
            { role: 'system', content: systemPrompt },
            ...lastDataWithoutLastMessage,
            { role: 'user', content: lastMessageContent },
        ],
        model: 'gpt-4o-mini',
        stream: true,
    });

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            try {
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        const text = encoder.encode(content);
                        controller.enqueue(text);
                    }
                }
            } catch (err) {
                controller.error(err);
            } finally {
                controller.close();
            }
        },
    });

    return new NextResponse(stream);
}