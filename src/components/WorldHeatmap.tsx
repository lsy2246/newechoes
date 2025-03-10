import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import worldData from '@/assets/world.zh.json';
import chinaData from '@/assets/china.json';

interface WorldHeatmapProps {
  visitedPlaces: string[];
}

const WorldHeatmap: React.FC<WorldHeatmapProps> = ({ visitedPlaces }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    const mergedWorldData = {
      ...worldData,
      features: worldData.features.map((feature: any) => {
        if (feature.properties.name === '中国') {
          return {
            ...feature,
            geometry: {
              type: 'MultiPolygon',
              coordinates: []
            }
          };
        }
        return feature;
      }).concat(
        chinaData.features.map((feature: any) => ({
          ...feature,
          properties: {
            ...feature.properties,
            name: feature.properties.name
          }
        }))
      )
    };

    echarts.registerMap('merged-world', mergedWorldData as any);

    const option = {
      title: {
        text: '我的旅行足迹',
        left: 'center',
        top: 20
      },
      tooltip: {
        trigger: 'item',
        formatter: ({name}: {name: string}) => {
          const visited = visitedPlaces.includes(name);
          return `${name}<br/>${visited ? '✓ 已去过' : '尚未去过'}`;
        }
      },
      visualMap: {
        show: true,
        type: 'piecewise',
        pieces: [
          { value: 1, label: '已去过' },
          { value: 0, label: '未去过' }
        ],
        inRange: {
          color: ['#e0e0e0', '#91cc75']
        },
        outOfRange: {
          color: ['#e0e0e0']
        },
        textStyle: {
          color: '#333'
        }
      },
      series: [{
        name: '旅行足迹',
        type: 'map',
        map: 'merged-world',
        roam: true,
        emphasis: {
          label: {
            show: true
          },
          itemStyle: {
            areaColor: '#91cc75'
          }
        },
        data: mergedWorldData.features.map((feature: any) => ({
          name: feature.properties.name,
          value: visitedPlaces.includes(feature.properties.name) ? 1 : 0
        })),
        nameProperty: 'name'
      }]
    };

    chart.setOption(option);

    window.addEventListener('resize', () => {
      chart.resize();
    });

    return () => {
      chart.dispose();
      window.removeEventListener('resize', () => {
        chart.resize();
      });
    };
  }, [visitedPlaces]);

  return <div ref={chartRef} style={{ width: '100%', height: '600px' }} />;
};

export default WorldHeatmap; 