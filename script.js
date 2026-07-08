const KEY = "-";

async function getAccessToken() {
    const body = new URLSearchParams({
        password: "-",
        twoFa: "-",
        twoFaTyp: "totp"
    });

    const response = await fetch(
        "https://api.tradejini.com/v2/api-gw/oauth/individual-token-v2",
        {   method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Bearer ${KEY}`
            },
            body}
    );

    const data = await response.json();
    return data.access_token;
}

async function getSymbol(headers) {
    const res = await fetch(
        "https://api.tradejini.com/v2/api/mkt-data/scrips/symbol-store/Securities",
        { headers }
    );

    const data = await res.text();
    const lines = data.trim().split("\n");
    const header = lines[0].split(",");

    const idIndex = header.indexOf("id");
    const nameIndex = header.indexOf("dispName");

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        if (cols[nameIndex] === "RELIANCE") {
            console.log("Symbol ID:", cols[idIndex]);
            return cols[idIndex];
        }
    }
}

async function getChartData(symbolId, headers) {
    const from = Math.floor(new Date("2026-06-08T09:15:00").getTime()/1000);
    const to = Math.floor(new Date("2026-06-08T09:45:00").getTime()/1000);

    const url =
    `https://api.tradejini.com/v2/api/mkt-data/chart/interval-data?from=${from}&to=${to}&interval=1&id=${symbolId}`;

    const response = await fetch(url, {headers});
    const data = await response.json();
    return data;
}

function calcEMA(prices, period){
    const ema = [];
    const mult = 2/(period + 1); 
    ema[0] = prices[0];

    for (let i = 1; i < prices.length; i++) 
        ema[i] = prices[i]*mult +ema[i-1]*(1-mult);

    return ema;
}

function crossover(ema10,ema12, candles){
    for (let i = 1; i < ema10.length; i++) {
        if (ema10[i-1]<=ema12[i-1] && ema10[i]>ema12[i]) 
            console.log("buy at", new Date(candles.d.bars[i][0]));

        if (ema10[i-1]>=ema12[i-1] && ema10[i]<ema12[i]) 
            console.log("sell at", new Date(candles.d.bars[i][0]));
    }
}

async function main() {
    const token = await getAccessToken();
    const headers = {
        Authorization: `Bearer ${KEY}:${token}`
    };

    const symbolId = await getSymbol(headers);
    const candles = await getChartData(symbolId, headers);
    const closes = candles.d.bars.map(bar => bar[4]);
    console.log("Candles:");
    console.log(candles.d.bars[0]);

    const ema10 = calcEMA(closes, 10);
    const ema12 = calcEMA(closes, 12);
    crossover(ema10,ema12,candles);
}

main();
