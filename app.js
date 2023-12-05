const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const osUtils = require('os-utils');
const si = require('systeminformation');
const Chart = require('chart.js');
const pidusage = require('pidusage');
const os = require('os');


const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const port = 6789;

app.use(express.static(__dirname))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

wss.on('connection', (ws) => {
    // Gửi dữ liệu ban đầu khi có kết nối mới
    sendSystemData(ws);

    // Cập nhật dữ liệu mỗi giây và gửi đến client
    const intervalId = setInterval(() => {
        sendSystemData(ws);
    }, 1000);

    ws.on('close', () => {
        // Dừng việc gửi dữ liệu khi kết nối đóng
        clearInterval(intervalId);
    });
});

function sendSystemData(ws) {
    // Lấy thông tin CPU
    getCpuUsage().then((cpuUsage) => {
        // Gửi dữ liệu qua WebSocket
        //console.clear();
        //console.log(cpuUsage)
        ws.send(JSON.stringify({ cpuUsage }));
    });

    // Lấy thông tin RAM
    getMemoryInfo().then((memoryInfo) => {
        // Gửi dữ liệu qua WebSocket
        ws.send(JSON.stringify({ memoryInfo }));
    });

    // Lấy thông tin ổ đĩa
    getDiskInfo().then((diskInfo) => {
        // Gửi dữ liệu qua WebSocket
        // console.log(diskInfo)
        ws.send(JSON.stringify({ diskInfo }));
    });

    // Lấy thông tin mạng
    getNetworkInfo().then((networkInfo) => {
        // Gửi dữ liệu qua WebSocket
        ws.send(JSON.stringify({ networkInfo }));
    });

    // Lấy thông tin pin
    getBatteryInfo().then((batteryInfo) => {
        // Gửi dữ liệu qua WebSocket
        ws.send(JSON.stringify({ batteryInfo }));
    });
}

async function getCpuUsage() {
    return new Promise((resolve) => {
        osUtils.cpuUsage((value) => {
            resolve(value * 100);
        });
    });
}

async function getCpuUsage1() {
    return new Promise(async (resolve) => {
        const usage = await pidusage(process.pid);
        resolve(usage.cpu);
    });
}

async function getCpuUsage2() {
    return new Promise((resolve) => {
        const cpuUsage = os.cpus()[0].times;
        const totalUsage = cpuUsage.user + cpuUsage.nice + cpuUsage.sys + cpuUsage.idle;
        const cpuPercentage = ((totalUsage - cpuUsage.idle) / totalUsage) * 100;
        resolve(cpuPercentage);
    });
}

async function getMemoryInfo() {
    const data = await si.mem();
    //console.log('getMemoryInfo:', data)
    return {
        total: (data.total / 1024 / 1024).toFixed(2),
        free: (data.free / 1024 / 1024).toFixed(2),
        core: data
    };
}

async function getDiskInfo() {
    try {
        const data = await si.fsSize();
        //console.log('getDiskInfo:', data)
        // Kiểm tra xem có dữ liệu không
        if (data.length === 0) {
            throw new Error('Không có thông tin về ổ đĩa.');
        }

        // Lấy thông tin ổ đĩa đầu tiên
        const diskInfo = data[0];

        // Chắc chắn rằng có dữ liệu về kích thước và trống
        if (!diskInfo.size || !diskInfo.used) {
            throw new Error('Dữ liệu không hợp lệ.');
        }

        // Tính toán thông tin về kích thước và trống
        const total = (diskInfo.size / 1024 / 1024 / 1024).toFixed(2);
        const free = (diskInfo.available / 1024 / 1024 / 1024).toFixed(2);

        return { total, free, diskInfo: data };
    } catch (error) {
        console.error('Lỗi khi lấy thông tin ổ đĩa:', error.message);
        return { total: 'N/A', free: 'N/A' };
    }
}

async function getNetworkInfo() {
    try {
        const networkInfo = await si.networkStats();
        // Chọn một giao diện mạng để lấy thông tin
        const selectedInterface = networkInfo[0];
        // Tính toán tốc độ nhận và gửi dữ liệu (đơn vị là bytes)
        const receivedSpeed = parseInt(selectedInterface.rx_sec);
        const sentSpeed = parseInt(selectedInterface.tx_sec);
        return { receivedSpeed, sentSpeed };
    } catch (error) {
        console.error('Lỗi khi lấy thông tin mạng:', error.message);
        return { receivedSpeed: 'N/A', sentSpeed: 'N/A' };
    }
}

async function getBatteryInfo() {
    try {
        const batteryInfo = await si.battery();
        // Lấy dung lượng pin hiện tại và dung lượng pin tối đa
        const currentCapacity = batteryInfo.capacity;
        const maxCapacity = batteryInfo.maxcapacity;

        //console.log(batteryInfo)

        return { ...batteryInfo };
    } catch (error) {
        console.error('Lỗi khi lấy thông tin pin:', error.message);
        return { currentCapacity: 'N/A', maxCapacity: 'N/A' };
    }
}

server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
