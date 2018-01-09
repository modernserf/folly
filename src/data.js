import { createStore } from 'redux'
import DB from './db'

const cycle = (states, currentState) =>
    states[(states.indexOf(currentState) + 1) % states.length]

export const viewStates = ['view', 'edit']
export const runStates = ['active', 'disabled']

const factGroup = (l) => ({ 'meta/type': 'fact_group', 'meta/label': l, viewState: 'view', runState: 'active' })
const fact = (l) => ({ 'meta/type': 'fact', 'meta/label': l, viewState: 'view', runState: 'active' })

const db = new DB({
    stations: {
        ...factGroup('Stations'),
        children: [
            'alewife', 'davis', 'porter', 'harvard', 'central', 'kendall',
            'charles', 'park', 'dtx', 'south', 'broadway', 'andrew', 'jfk',
        ],
    },
    lines: {
        ...factGroup('Lines'),
        children: ['red', 'blue', 'orange', 'green'],
    },
    alewife: fact('Alewife'),
    davis: fact('Davis'),
    porter: fact('Porter'),
    harvard: fact('Harvard'),
    central: fact('Central'),
    kendall: fact('Kendall/MIT'),
    charles: fact('Charles/MGH'),
    park: fact('Park St'),
    dtx: fact('Downtown Crossing'),
    south: fact('South Station'),
    broadway: fact('Broadway'),
    andrew: fact('Andrew'),
    jfk: fact('JFK/UMass'),

    red: fact('Red'),
    blue: fact('Blue'),
    orange: fact('Orange'),
    green: fact('Green'),
})

const createReducer = (map, initState) => (state = initState, action) => {
    if (map[action.type]) {
        return map[action.type](state, action.payload, action)
    }
    return state
}

const rootReducer = createReducer({
    // both facts and groups
    editItem: (db, { id }) =>
        db.patch(id, { viewState: 'edit' }),
    disableItem: (db, { id }) => {
        const prevState = db.find(id, 'runState')
        return db.patch(id, { runState: cycle(runStates, prevState) })
    },
    createFactGroup: (db) => {
        const [, next] = db.insert({
            ...factGroup(''),
            viewState: 'edit',
            firstEdit: true,
        })
        return next
    },
    updateFactGroup: (db, { value, id }) => {
        const children = db.findAll(id, 'children')
        if (db.find(id, 'firstEdit')) {
            let [childID, next] = db.insert({
                ...fact(''),
                viewState: 'edit',
            })
            children.push(childID)
            db = next
        }
        return db.patch(id, {
            'meta/label': value || 'New Group',
            firstEdit: false,
            viewState: 'view',
            children,
        })
    },
    createFact: (db, { parentID }) => {
        const [id, next] = db.insert({
            ...fact(''),
            viewState: 'edit',
        })
        return next.push([parentID, 'children', id])
    },
    updateFact: (db, { id, value }) => {
        return db.patch(id, {
            'meta/label': value || 'New Fact',
            viewState: 'view',
        })
    },
    updateAndCreateNextFact: (db, { id, parentID, value }) => {
        const next = db.patch(id, {
            'meta/label': value || 'New Fact',
            viewState: 'view',
        })
        const [newID, next2] = next.insert({
            ...fact(''),
            viewState: 'edit',
        })

        return next2.push([parentID, 'children', newID])
    },
}, db)

export const store = createStore(rootReducer)

const _dispatch = store.dispatch
store.dispatch = (type, payload) => {
    if (typeof type === 'string') {
        _dispatch({ type, payload })
    } else {
        _dispatch(type)
    }
}
