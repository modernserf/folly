import shortid from 'shortid'
import { createStore, combineReducers } from 'redux'

export const viewStates = ['view', 'edit']
export const runStates = ['active', 'disabled']

const cycle = (states, currentState) =>
    states[(states.indexOf(currentState) + 1) % states.length]

const createFact = (extend = {}) => ({
    id: shortid.generate(),
    label: '',
    type: 'fact',
    viewState: 'view',
    runState: 'active',
    ...extend,
})

function facts ({ label, items }) {
    let parentID = shortid.generate()
    return [
        { id: parentID, label, type: 'fact-group', runState: 'active' },
        ...items.map((label) => createFact({
            parentID,
            label,
        })),
    ]
}

const stations = facts({
    label: 'Stations',
    items: [
        'Alewife',
        'Davis',
        'Porter',
        'Harvard',
        'Central',
        'Kendall',
        'Charles/MGH',
        'Park St',
        'Downtown Crossing',
        'South Station',
        'Broadway',
        'Andrew',
        'JFK/UMass',
    ],
})

const lines = facts({
    label: 'Lines',
    items: [
        'Red',
        'Blue',
        'Orange',
        'Green',
    ],
})

const createReducer = (map, initState) => (state = initState, action) => {
    if (map[action.type]) {
        return map[action.type](state, action.payload, action)
    }
    return state
}

const defaultWhere = (x, payload) => x.id === payload.id

const append = (f) => (state, payload, action) =>
    state.concat(f(payload, action))
const update = (f, where = defaultWhere) => (state, payload, action) =>
    state.map((x) => where(x, payload, action) ? f(x, payload, action) : x)
const remove = (where = defaultWhere) => (state, payload, action) =>
    state.filter((x) => !where(x, payload, action))

const pipe = (...reducers) => (prevState, payload, action) =>
    reducers.reduce((state, reducer) => reducer(state, payload, action), prevState)

const dataReducer = createReducer({
    createList: append(() =>
        [{ id: shortid.generate(), label: 'New List', type: 'fact-group' }]),
    createFact: append(({ parentID }) => [createFact({
        parentID,
        viewState: 'edit',
    })]),
    editItem: update((item) => ({ ...item, viewState: 'edit' })),
    disableItem: update((item) => ({ ...item, runState: cycle(runStates, item.runState) })),
    updateFact: update((item, payload) => ({
        ...item,
        label: payload.value || 'New Fact',
        viewState: 'view',
    })),
    updateAndCreateNextFact: pipe(
        update((item, { value }) => ({
            ...item,
            label: value || 'New Fact',
            viewState: 'view',
        })),
        (state, { id }) => {
            const parentID = state.find((x) => x.id === id).parentID
            return state.concat([createFact({
                parentID,
                viewState: 'edit',
            })])
        }
    ),
    deleteItem: remove(),
}, [])

const rootReducer = combineReducers({
    data: dataReducer,
})

const initState = {
    data: [...stations, ...lines],
}

export const store = createStore(rootReducer, initState)

const _dispatch = store.dispatch
store.dispatch = (type, payload) => {
    if (typeof type === 'string') {
        _dispatch({ type, payload })
    } else {
        _dispatch(type)
    }
}
