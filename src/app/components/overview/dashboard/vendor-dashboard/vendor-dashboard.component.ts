import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { ChartModule } from 'primeng/chart';

@Component({
    selector: 'vendor-dashboard',
    templateUrl: './vendor-dashboard.component.html',
    standalone: true,
    imports: [ChartModule]
})
export class VendorDashboardComponent implements OnInit {
    data: any;
    options: any;
    basicData: any;
    basicOptions: any;
    platformId = inject(PLATFORM_ID);

    constructor(private cd: ChangeDetectorRef) {}

    ngOnInit() {
        this.initChart();
    }

    initChart() {
        if (isPlatformBrowser(this.platformId)) {
            const documentStyle = getComputedStyle(document.documentElement);
            const textColor = documentStyle.getPropertyValue('--p-text-color');
            const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
            const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

            this.data = this.createChartData([
                { label: 'First Dataset', data: [65, 59, 80, 81, 56, 55, 40], borderColor: '#207bc5' },
                { label: 'Second Dataset', data: [28, 48, 40, 19, 86, 27, 90], borderColor: '#144f80', borderDash: [5, 5] },
                { label: 'Third Dataset', data: [12, 51, 62, 33, 21, 62, 45], backgroundColor: '#88827a', borderColor: '#e18a25' }
            ]);

            this.options = this.createChartOptions(textColor, textColorSecondary, surfaceBorder);

            this.basicData = {
                labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                datasets: [{
                    label: 'Sales',
                    data: [540, 325, 702, 620],
                    backgroundColor: ['rgba(249, 115, 22, 0.2)', 'rgba(6, 182, 212, 0.2)', 'rgb(107, 114, 128, 0.2)', 'rgba(139, 92, 246, 0.2)'],
                    borderColor: ['rgb(249, 115, 22)', 'rgb(6, 182, 212)', 'rgb(107, 114, 128)', 'rgb(139, 92, 246)'],
                    borderWidth: 1
                }]
            };

            this.basicOptions = this.createBasicChartOptions(textColor, textColorSecondary, surfaceBorder);
            this.cd.markForCheck();
        }
    }

    createChartData(datasets: any[]) {
        return {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
            datasets: datasets.map(dataset => ({
                label: dataset.label,
                data: dataset.data,
                fill: false,
                tension: 0.4,
                borderColor: dataset.borderColor,
                borderDash: dataset.borderDash,
                backgroundColor: dataset.backgroundColor
            }))
        };
    }

    createChartOptions(textColor: string, textColorSecondary: string, surfaceBorder: string) {
        return {
            maintainAspectRatio: false,
            aspectRatio: 0.6,
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        color: surfaceBorder
                    }
                },
                y: {
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        color: surfaceBorder
                    }
                }
            }
        };
    }

    createBasicChartOptions(textColor: string, textColorSecondary: string, surfaceBorder: string) {
        return {
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        color: surfaceBorder
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        color: surfaceBorder
                    }
                }
            }
        };
    }
}
