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
        "https://api.tradejini.com/v2/api/mkt-data/scrips/symbol-store/Index",
        { headers }
    );

    const data = await res.text();
    const lines = data.trim().split("\n");
    const header = lines[0].split(",");

    const idIndex = header.indexOf("id");
    const nameIndex = header.indexOf("dispName");

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        if (cols[nameIndex] === "Nifty 50") {
            console.log("Symbol ID:", cols[idIndex]);
            return cols[idIndex];
        }
    }
}

async function getChartData(symbolId, headers) {
    const to = Math.floor(Date.now() / 1000);
    const from = to - (30 * 60);
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
    const n = ema10.length;

    if (ema10[n-2] <= ema12[n-2] && ema10[n-1] > ema12[n-1]) 
        console.log(`${new Date(candles.d.bars[n-1][0]).toLocaleTimeString()} - buy`);
    else if (ema10[n-2] >= ema12[n-2] && ema10[n-1] < ema12[n-1]) 
        console.log(`${new Date(candles.d.bars[n-1][0]).toLocaleTimeString()} - sell`);
    else console.log("no crossover");
}

async function scan(headers, symbolId) {
    const now = new Date();
    const mins = now.getHours()*60 + now.getMinutes();

    const marketOpen = 9*60 + 15;
    const marketClose = 15*60 + 30;
    if (mins < marketOpen || mins > marketClose) {
        console.log("Market closed");
        return;
    }

    const candles = await getChartData(symbolId, headers);
    const closes = candles.d.bars.map(bar => bar[4]);
    const ema10 = calcEMA(closes, 10);
    const ema12 = calcEMA(closes, 12);
    crossover(ema10, ema12, candles);
}

async function main() {
    const token = await getAccessToken();
    const headers = {
        Authorization: `Bearer ${API_KEY}:${token}`
    };
    const symbolId = await getSymbol(headers);
    await scan(headers, symbolId);
    
    setInterval(async () => {
        await scan(headers, symbolId);
    }, 60000);
}

main();
