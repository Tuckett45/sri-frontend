import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { StateVisualizationComponent } from './state-visualization.component';
import { StateNode, StateTransition } from '../../models/state-visualization.models';
import { FormsModule } from '@angular/forms';

describe('StateVisualizationComponent', () => {
  let component: StateVisualizationComponent;
  let fixture: ComponentFixture<StateVisualizationComponent>;
  let store: MockStore;

  const mockStateNode: StateNode = {
    id: 'state-1',
    name: 'Initial State',
    type: 'initial',
    metadata: {}
  };

  const mockTransition: StateTransition = {
    id: 'trans-1',
    fromState: 'state-1',
    toState: 'state-2',
    trigger: 'start',
    timestamp: new Date(),
    userId: 'user-1',
    userName: 'Test User',
    metadata: {}
  };

  const mockStateHistory = {
    entityId: 'entity-1',
    entityType: 'job',
    transitions: [mockTransition],
    currentState: mockStateNode,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const initialState = {
    stateHistory: {
      histories: { 'entity-1': mockStateHistory },
      currentState: mockStateNode,
      transitions: [mockTransition],
      loading: false,
      error: null,
      selectedEntityId: 'entity-1',
      selectedEntityType: 'job'
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StateVisualizationComponent],
      imports: [FormsModule],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(StateVisualizationComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.graphLayout).toBe('horizontal');
    expect(component.highlightPath).toBe(true);
    expect(component.showTransitions).toBe(true);
  });

  it('should load state data on init when entityId is provided', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.entityId = 'entity-1';
    component.entityType = 'job';
    
    component.ngOnInit();
    
    expect(dispatchSpy).toHaveBeenCalledTimes(2);
  });

  it('should emit stateSelected event when node is clicked', (done) => {
    component.stateSelected.subscribe((state: StateNode) => {
      expect(state.id).toBe(mockStateNode.id);
      expect(state.name).toBe(mockStateNode.name);
      done();
    });

    // Simulate node click
    component['onNodeClick'](mockStateNode as any);
  });

  it('should change layout when changeLayout is called', () => {
    const renderSpy = spyOn<any>(component, 'renderStateMachine');
    component.changeLayout('vertical');
    
    expect(component.graphLayout).toBe('vertical');
    expect(renderSpy).toHaveBeenCalled();
  });

  it('should get correct node color based on type', () => {
    const initialNode = { ...mockStateNode, type: 'initial' as const };
    const finalNode = { ...mockStateNode, type: 'final' as const };
    const errorNode = { ...mockStateNode, type: 'error' as const };
    const intermediateNode = { ...mockStateNode, type: 'intermediate' as const };

    expect(component['getNodeColor'](initialNode as any)).toBe('#4CAF50');
    expect(component['getNodeColor'](finalNode as any)).toBe('#2196F3');
    expect(component['getNodeColor'](errorNode as any)).toBe('#F44336');
    expect(component['getNodeColor'](intermediateNode as any)).toBe('#9E9E9E');
  });

  it('should prepare graph data from state history', () => {
    component['prepareGraphData'](mockStateHistory);
    
    expect(component['nodes'].length).toBeGreaterThan(0);
    expect(component['links'].length).toBe(1);
  });

  it('should handle empty state history gracefully', () => {
    component['prepareGraphData'](null);
    
    expect(component['nodes'].length).toBe(0);
    expect(component['links'].length).toBe(0);
  });

  it('should apply horizontal layout correctly', () => {
    component['nodes'] = [
      { id: '1', name: 'State 1', type: 'initial', metadata: {} },
      { id: '2', name: 'State 2', type: 'intermediate', metadata: {} }
    ];
    component['width'] = 900;
    component['height'] = 600;

    component['applyHorizontalLayout']();

    expect(component['nodes'][0].x).toBe(300);
    expect(component['nodes'][0].y).toBe(300);
    expect(component['nodes'][1].x).toBe(600);
    expect(component['nodes'][1].y).toBe(300);
  });

  it('should apply vertical layout correctly', () => {
    component['nodes'] = [
      { id: '1', name: 'State 1', type: 'initial', metadata: {} },
      { id: '2', name: 'State 2', type: 'intermediate', metadata: {} }
    ];
    component['width'] = 800;
    component['height'] = 900;

    component['applyVerticalLayout']();

    expect(component['nodes'][0].x).toBe(400);
    expect(component['nodes'][0].y).toBe(300);
    expect(component['nodes'][1].x).toBe(400);
    expect(component['nodes'][1].y).toBe(600);
  });

  it('should apply radial layout correctly', () => {
    component['nodes'] = [
      { id: '1', name: 'State 1', type: 'initial', metadata: {} }
    ];
    component['width'] = 800;
    component['height'] = 600;

    component['applyRadialLayout']();

    expect(component['nodes'][0].x).toBeDefined();
    expect(component['nodes'][0].y).toBeDefined();
  });

  it('should stop simulation on destroy', () => {
    const mockSimulation = {
      stop: jasmine.createSpy('stop')
    };
    component['simulation'] = mockSimulation as any;

    component.ngOnDestroy();

    expect(mockSimulation.stop).toHaveBeenCalled();
  });

  it('should reload data when entityId changes', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.entityId = 'entity-1';
    component.entityType = 'job';
    
    fixture.detectChanges();
    
    component.entityId = 'entity-2';
    component.ngOnChanges({
      entityId: {
        currentValue: 'entity-2',
        previousValue: 'entity-1',
        firstChange: false,
        isFirstChange: () => false
      }
    });

    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should re-render when layout changes', () => {
    const renderSpy = spyOn<any>(component, 'renderStateMachine');
    
    component.ngOnChanges({
      graphLayout: {
        currentValue: 'vertical',
        previousValue: 'horizontal',
        firstChange: false,
        isFirstChange: () => false
      }
    });

    expect(renderSpy).toHaveBeenCalled();
  });
});
