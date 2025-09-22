import { NextResponse } from "next/server";

const MOCK_BASE = process.env.MOCK_API_BASE || "http://localhost:5001/learning/odatav4/public/admin";

export async function GET() {
    try {
        const res = await fetch(`${MOCK_BASE}/curriculum-service/v1/Curricula`);

        const contentType = res.headers.get("content-type");
        if (!res.ok) {
            return NextResponse.json({ error: `Status ${res.status}` }, { status: res.status });
        }
        if (!contentType?.includes("application/json")) {
            const text = await res.text();
            return NextResponse.json({ error: "Invalid JSON", body: text }, { status: 500 });
        }

        const data = await res.json();
        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
    }
}
