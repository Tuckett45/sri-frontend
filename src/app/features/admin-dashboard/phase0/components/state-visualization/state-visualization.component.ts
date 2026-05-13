import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import * as d3 from 'd3';
import { StateNode, StateTransition, GraphLayout } from '../../models/state-visualization.models';
import { 
  selectCurrentState, 
  selectStateTransitions, 
  selectStateHistoryLoading,
  selectSelectedEntityHistory
} from '../../state/state-history/state-history.selectors';
import { loadStateHistory, loadStateTransitions } from '../../state/state-history/state-history.actions';

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'initial' | 'intermediate' | 'final' | 'error';
  metadata: Record<string, any>;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string;
  trigger: string;
}

@Component({
  selector: 'app-state-visualization',
  templateUrl: './state-visualization.component.html',
  styleUrls: ['./state-visualization.component.scss']
})
export class StateVisualizationComponent implements OnInit, OnChanges, OnDestroy {
  @Input() entityType: 'job' | 'deployment' | 'workflow' = 'job';
  @Input() entityId: string = '';
  @Input() showTransitions: boolean = true;
  @Output() stateSelected = new EventEmitter<StateNode>();

  @ViewChild('svgContainer', { static: true }) svgContainer!: ElementRef<HTMLDivElement>;

  // Observables
  stateHistory$: Observable<any>;
  currentState$: Observable<StateNode | null>;
  availableTransitions$: Observable<StateTransition[]>;
  loading$: Observable<boolean>;

  // Visualization config
  graphLayout: GraphLayout = 'horizontal';
  highlightPath: boolean = true;

  // D3 elements
  private svg: any;
  private g: any;
  private simulation: d3.Simulation<D3Node, D3Link> | null = null;
  private width: number = 800;
  private height: number = 600;
  private destroy$ = new Subject<void>();

  // State data
  private nodes: D3Node[] = [];
  private links: D3Link[] = [];
  private currentStateId: string | null = null;

  constructor(private store: Store) {
    this.stateHistory$ = this.store.select(selectSelectedEntityHistory);
    this.currentState$ = this.store.select(selectCurrentState);
    this.availableTransitions$ = this.store.select(selectStateTransitions);
    this.loading$ = this.store.select(selectStateHistoryLoading);
  }

  ngOnInit(): void {
    this.initializeSvg();
    this.loadStateData();
    this.subscribeToStateChanges();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['entityId'] || changes['entityType']) && this.entityId) {
      this.loadStateData();
    }
    if (changes['graphLayout']) {
      this.renderStateMachine();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.simulation) {
      this.simulation.stop();
    }
  }

  private initializeSvg(): void {
    const container = this.svgContainer.nativeElement;
    this.width = container.clientWidth || 800;
    this.height = container.clientHeight || 600;

    this.svg = d3.select(container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform);
      });

    this.svg.call(zoom);

    // Create main group for graph elements
    this.g = this.svg.append('g');

    // Add arrow marker for transitions
    this.svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');
  }

  private loadStateData(): void {
    if (this.entityId && this.entityType) {
      this.store.dispatch(loadStateHistory({ entityId: this.entityId, entityType: this.entityType }));
      this.store.dispatch(loadStateTransitions({ entityId: this.entityId, entityType: this.entityType }));
    }
  }

  private subscribeToStateChanges(): void {
    this.stateHistory$.pipe(takeUntil(this.destroy$)).subscribe(history => {
      if (history) {
        this.prepareGraphData(history);
        this.renderStateMachine();
      }
    });

    this.currentState$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      if (state) {
        this.currentStateId = state.id;
        this.highlightCurrentState();
      }
    });
  }

  private prepareGraphData(history: any): void {
    if (!history || !history.transitions) {
      return;
    }

    // Extract unique states from transitions
    const stateMap = new Map<string, D3Node>();
    
    // Add current state
    if (history.currentState) {
      stateMap.set(history.currentState.id, {
        id: history.currentState.id,
        name: history.currentState.name,
        type: history.currentState.type,
        metadata: history.currentState.metadata
      });
    }

    // Extract states from transitions
    history.transitions.forEach((transition: StateTransition) => {
      if (!stateMap.has(transition.fromState)) {
        stateMap.set(transition.fromState, {
          id: transition.fromState,
          name: transition.fromState,
          type: 'intermediate',
          metadata: {}
        });
      }
      if (!stateMap.has(transition.toState)) {
        stateMap.set(transition.toState, {
          id: transition.toState,
          name: transition.toState,
          type: 'intermediate',
          metadata: {}
        });
      }
    });

    this.nodes = Array.from(stateMap.values());

    // Create links from transitions
    this.links = history.transitions.map((transition: StateTransition) => ({
      id: transition.id,
      source: transition.fromState,
      target: transition.toState,
      trigger: transition.trigger
    }));
  }

  renderStateMachine(): void {
    if (this.nodes.length === 0) {
      return;
    }

    // Clear existing elements
    this.g.selectAll('*').remove();

    // Apply layout-specific positioning
    this.applyLayout();

    // Create force simulation
    this.simulation = d3.forceSimulation<D3Node>(this.nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(this.links)
        .id(d => d.id)
        .distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(50));

    // Draw links (transitions)
    const link = this.g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(this.links)
      .enter().append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    // Draw link labels
    const linkLabel = this.g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(this.links)
      .enter().append('text')
      .attr('class', 'link-label')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .text((d: D3Link) => d.trigger);

    // Draw nodes (states)
    const node = this.g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(this.nodes)
      .enter().append('g')
      .attr('class', 'node')
      .call(d3.drag<SVGGElement, D3Node>()
        .on('start', (event, d) => this.dragStarted(event, d))
        .on('drag', (event, d) => this.dragged(event, d))
        .on('end', (event, d) => this.dragEnded(event, d)));

    // Add circles for nodes
    node.append('circle')
      .attr('r', 20)
      .attr('fill', (d: D3Node) => this.getNodeColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('click', (_event: any, d: D3Node) => this.onNodeClick(d));

    // Add labels for nodes
    node.append('text')
      .attr('dy', 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#333')
      .text((d: D3Node) => d.name);

    // Update positions on simulation tick
    this.simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => (d.source as D3Node).x || 0)
        .attr('y1', (d: any) => (d.source as D3Node).y || 0)
        .attr('x2', (d: any) => (d.target as D3Node).x || 0)
        .attr('y2', (d: any) => (d.target as D3Node).y || 0);

      linkLabel
        .attr('x', (d: any) => ((d.source as D3Node).x! + (d.target as D3Node).x!) / 2)
        .attr('y', (d: any) => ((d.source as D3Node).y! + (d.target as D3Node).y!) / 2);

      node.attr('transform', (d: D3Node) => `translate(${d.x},${d.y})`);
    });

    this.highlightCurrentState();
  }

  private applyLayout(): void {
    switch (this.graphLayout) {
      case 'horizontal':
        this.applyHorizontalLayout();
        break;
      case 'vertical':
        this.applyVerticalLayout();
        break;
      case 'radial':
        this.applyRadialLayout();
        break;
    }
  }

  private applyHorizontalLayout(): void {
    const spacing = this.width / (this.nodes.length + 1);
    this.nodes.forEach((node, i) => {
      node.x = spacing * (i + 1);
      node.y = this.height / 2;
    });
  }

  private applyVerticalLayout(): void {
    const spacing = this.height / (this.nodes.length + 1);
    this.nodes.forEach((node, i) => {
      node.x = this.width / 2;
      node.y = spacing * (i + 1);
    });
  }

  private applyRadialLayout(): void {
    const radius = Math.min(this.width, this.height) / 3;
    const angleStep = (2 * Math.PI) / this.nodes.length;
    this.nodes.forEach((node, i) => {
      const angle = i * angleStep;
      node.x = this.width / 2 + radius * Math.cos(angle);
      node.y = this.height / 2 + radius * Math.sin(angle);
    });
  }

  private getNodeColor(node: D3Node): string {
    switch (node.type) {
      case 'initial':
        return '#4CAF50';
      case 'final':
        return '#2196F3';
      case 'error':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  }

  private highlightCurrentState(): void {
    if (!this.currentStateId) {
      return;
    }

    this.g.selectAll('.node circle')
      .attr('stroke', (d: D3Node) => d.id === this.currentStateId ? '#FF9800' : '#fff')
      .attr('stroke-width', (d: D3Node) => d.id === this.currentStateId ? 4 : 2);
  }

  highlightTransition(transition: StateTransition): void {
    this.g.selectAll('.link')
      .attr('stroke', (d: D3Link) => d.id === transition.id ? '#FF9800' : '#999')
      .attr('stroke-width', (d: D3Link) => d.id === transition.id ? 4 : 2);
  }

  private onNodeClick(node: D3Node): void {
    const stateNode: StateNode = {
      id: node.id,
      name: node.name,
      type: node.type,
      metadata: node.metadata
    };
    this.stateSelected.emit(stateNode);
  }

  exportDiagram(format: 'svg' | 'png'): void {
    const svgElement = this.svg.node();
    
    if (format === 'svg') {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `state-diagram-${this.entityId}.svg`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'png') {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          if (blob) {
            const pngUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = `state-diagram-${this.entityId}.png`;
            link.click();
            URL.revokeObjectURL(pngUrl);
          }
        });
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    }
  }

  changeLayout(layout: GraphLayout): void {
    this.graphLayout = layout;
    this.renderStateMachine();
  }

  getMetadataKeys(metadata: Record<string, any>): string[] {
    return Object.keys(metadata || {});
  }

  private dragStarted(event: any, d: D3Node): void {
    if (!event.active && this.simulation) {
      this.simulation.alphaTarget(0.3).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
  }

  private dragged(event: any, d: D3Node): void {
    d.fx = event.x;
    d.fy = event.y;
  }

  private dragEnded(event: any, d: D3Node): void {
    if (!event.active && this.simulation) {
      this.simulation.alphaTarget(0);
    }
    d.fx = null;
    d.fy = null;
  }
}
