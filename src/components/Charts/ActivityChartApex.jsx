import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faChartLine } from '@fortawesome/free-solid-svg-icons';

function ActivityChartApex({ data, period = 'year' }) {
    const [loading, setLoading] = useState(true);
    const [isEmpty, setIsEmpty] = useState(false);

    useEffect(() => {
        setLoading(true);
        
        const hasData = data && data.length > 0 && data.some(item => 
            (item.sources?.fobi > 0 || item.sources?.bird > 0 || 
             item.sources?.butterfly > 0 || item.sources?.identification > 0)
        );
        
        setIsEmpty(!hasData);
        
        const timer = setTimeout(() => {
            setLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [data, period]);

    if (isEmpty) {
        return (
            <div className="h-72 flex flex-col items-center justify-center text-gray-400">
                <FontAwesomeIcon icon={faChartLine} className="text-4xl mb-3 opacity-50" />
                <p className="text-sm">Belum ada aktivitas untuk periode {
                    period === 'year' ? 'tahun ini' : 
                    period === 'month' ? 'bulan ini' : 
                    period === 'week' ? 'minggu ini' : ''
                }</p>
            </div>
        );
    }
    const sortedData = [...(data || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const categories = sortedData.map(item => {
        const date = new Date(item.date);
        if (period === 'year') {
            return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        } else if (period === 'month') {
            return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        } else {
            return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
        }
    });

    const series = [
        {
            name: 'Amaturalist',
            data: sortedData.map(item => item.sources?.fobi || 0)
        },
        {
            name: 'Burungnesia',
            data: sortedData.map(item => item.sources?.bird || 0)
        },
        {
            name: 'Kupunesia',
            data: sortedData.map(item => item.sources?.butterfly || 0)
        },
        {
            name: 'Identifikasi',
            data: sortedData.map(item => item.sources?.identification || 0)
        }
    ];

    const options = {
        chart: {
            type: 'area',
            height: 280,
            background: 'transparent',
            toolbar: {
                show: false
            },
            zoom: {
                enabled: false
            },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800
            }
        },
        colors: ['#3B82F6', '#EC4899', '#8B5CF6', '#10B981'],
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.5,
                opacityTo: 0.1,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            categories: categories,
            labels: {
                style: {
                    colors: '#9CA3AF',
                    fontSize: '11px'
                },
                rotate: -45,
                rotateAlways: period !== 'week'
            },
            axisBorder: {
                color: '#374151'
            },
            axisTicks: {
                color: '#374151'
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: '#9CA3AF',
                    fontSize: '11px'
                },
                formatter: (value) => Math.round(value)
            }
        },
        grid: {
            borderColor: '#374151',
            strokeDashArray: 4,
            xaxis: {
                lines: {
                    show: false
                }
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'left',
            labels: {
                colors: '#E5E7EB'
            },
            markers: {
                width: 10,
                height: 10,
                radius: 2
            },
            itemMargin: {
                horizontal: 12,
                vertical: 4
            }
        },
        tooltip: {
            theme: 'dark',
            x: {
                show: true
            },
            y: {
                formatter: (value) => `${value} observasi`
            }
        },
        responsive: [
            {
                breakpoint: 640,
                options: {
                    chart: {
                        height: 240
                    },
                    legend: {
                        position: 'bottom',
                        horizontalAlign: 'center'
                    }
                }
            }
        ]
    };

    return (
        <div className="relative">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e]/80 z-10 rounded-lg">
                    <div className="flex flex-col items-center">
                        <FontAwesomeIcon icon={faSpinner} spin className="text-[#3B82F6] text-2xl mb-2" />
                        <span className="text-sm text-gray-400">Memuat grafik...</span>
                    </div>
                </div>
            )}
            <Chart 
                options={options} 
                series={series} 
                type="area" 
                height={280} 
            />
        </div>
    );
}

export default ActivityChartApex;
