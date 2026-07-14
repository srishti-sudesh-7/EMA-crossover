const API_KEY = "--";
const XLSX = require("xlsx");

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
                Authorization: `Bearer ${API_KEY}`
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
    const today = new Date();

    const f = new Date(today);
    f.setHours(9, 15, 0, 0);
    const t = new Date(today);
    t.setHours(15, 30, 0, 0);

    const from = Math.floor(f.getTime()/1000);
    const to = Math.floor(t.getTime()/1000);

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

function createExcel(candles, ema10, ema12) {
    const rows = candles.d.bars.map((bar, i) => ({
        Time: new Date(bar[0]).toLocaleTimeString(),
        Open: bar[1],
        High: bar[2],
        Low: bar[3],
        Close: bar[4],
        Volume: bar[5],
        EMA10: ema10[i],
        EMA12: ema12[i]
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook,worksheet,"Nifty50, 14-JUL");
    XLSX.writeFile(workbook, "Nifty50_EMA_Report.xlsx");
    console.log("excel file created");
}

async function scan(headers, symbolId) {
    const now = new Date();
    const mins = now.getHours()*60 + now.getMinutes();
    const marketOpen = 9*60 + 15;
    const marketClose = 15*60 + 30;
    
    const candles = await getChartData(symbolId, headers);
    const closes = candles.d.bars.map(bar => bar[4]);
    const ema10 = calcEMA(closes, 10);
    const ema12 = calcEMA(closes, 12);

    if (mins < marketOpen || mins > marketClose) {
        console.log("Market closed");
    }
    else crossover(ema10, ema12, candles);
    createExcel(candles, ema10, ema12);
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
