const ws = new WebSocket('ws://localhost:6789');
const batteryInfo = document.getElementById("batteryInfo");
let cpuChart;
let cpuData = [];
const maxDataPoints = 10;

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.cpuUsage !== undefined) {
        if (cpuChart) {
            cpuChart.destroy();
        }

        // Chắc chắn rằng cpuData là một mảng
        const newDataPoint = Array.isArray(data.cpuUsage) ? data.cpuUsage[0] : data.cpuUsage;

        // Thêm dữ liệu mới vào mảng
        cpuData.push(newDataPoint);

        // Giữ số lượng điểm dữ liệu tối đa
        if (cpuData.length > maxDataPoints) {
            cpuData.shift(); // Xóa điểm dữ liệu cũ nhất
        }

        // Kiểm tra xem biểu đồ đã được khởi tạo chưa
        if (cpuChart) {
            // Nếu có, hủy biểu đồ cũ
            cpuChart.destroy();
        }

        // Tạo biểu đồ CPU mới
        const labels = Array.from({ length: cpuData.length }, (_, i) => i + 1);
        const ctx = document.getElementById('cpuChart').getContext('2d');
        cpuChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `CPU Usage (${parseInt(data.cpuUsage)}%)`,
                    data: cpuData,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    fill: false,
                }],
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                    },
                },
            },
        });

    }

    if (data.memoryInfo !== undefined) {
        // Cập nhật thông tin RAM
        document.getElementById('totalMemory').innerText = data.memoryInfo.total;
        document.getElementById('freeMemory').innerText = data.memoryInfo.free;
        document.getElementById('usedMemory').innerText = toMB(data.memoryInfo.core.used);
        document.getElementById('activeMemory').innerText = toMB(data.memoryInfo.core.active);
        document.getElementById('availableMemory').innerText = toMB(data.memoryInfo.core.available);
    }

    if (data.diskInfo !== undefined) {
        // Cập nhật thông tin ổ đĩa
        document.getElementById('totalDisk').innerText = data.diskInfo.total;
        document.getElementById('freeDisk').innerText = data.diskInfo.free;
        const { total, free, ...ok } = data.diskInfo
        document.getElementById('freeDisks').innerText = JSON.stringify(ok, null, 4);
    }

    if (data.networkInfo !== undefined) {
        const { receivedSpeed, sentSpeed } = data.networkInfo;
        document.getElementById('receivedSpeed').innerText = receivedSpeed;
        document.getElementById('sentSpeed').innerText = sentSpeed;
    }

    if (data.batteryInfo !== undefined) {
        batteryInfo.innerHTML = "";
        let batteryData = data.batteryInfo;
        for (const key in batteryData) {
            const value = batteryData[key];
            const listItem = document.createElement('li');
            listItem.innerHTML = `<strong>${key}:</strong> ${value}`;
            batteryInfo.appendChild(listItem);
        }
    }
};

function toMB(val) {
    return (val / 1024 / 1024).toFixed(0);
} 