import { utilService } from './util.service.js'
import { storageService } from './async-storage.service.js'

// const sampleLoc = {
//     id: 'GEouN',
//     name: 'Dahab, Egypt',
//     rate: 5,
//     geo: {
//         address: 'Dahab, South Sinai, Egypt',
//         lat: 28.5096676,
//         lng: 34.5165187,
//         zoom: 11
//     },
//     createdAt: 1706562160181,
//     updatedAt: 1706562160181
// }

const PAGE_SIZE = 5
const DB_KEY = 'locs'
var gSortBy = { rate: -1, date: -1 }
var gFilterBy = { txt: '', minRate: 0 }
var gPageIdx

_createLocs()

export const locService = {
    query,
    getById,
    remove,
    save,
    setFilterBy,
    setSortBy,
    getLocCountByRateMap,
    getLocCountByUpdateTime
}

function query() {
    return storageService.query(DB_KEY)
        .then(locs => {
            if (gFilterBy.txt) {
                const regex = new RegExp(gFilterBy.txt, 'i')
                locs = locs.filter(loc => regex.test(loc.name))
            }
            if (gFilterBy.minRate) {
                locs = locs.filter(loc => loc.rate >= gFilterBy.minRate)
            }

            // No paging (unused)
            if (gPageIdx !== undefined) {
                const startIdx = gPageIdx * PAGE_SIZE
                locs = locs.slice(startIdx, startIdx + PAGE_SIZE)
            }

            if (gSortBy.rate !== undefined) {
                locs.sort((p1, p2) => (p1.rate - p2.rate) * gSortBy.rate)
            } else if (gSortBy.name !== undefined) {
                locs.sort((p1, p2) => p1.name.localeCompare(p2.name) * gSortBy.name)
            } else if (gSortBy.date !== undefined) {
                locs.sort((p1, p2) => {
                    const date1 = new Date(p1.lastUpdated)
                    const date2 = new Date(p2.lastUpdated)
                    return (date1 - date2) * gSortBy.date
                })
            }

            return locs
        })
}

function getById(locId) {
    return storageService.get(DB_KEY, locId)
}

function remove(locId) {
    return storageService.remove(DB_KEY, locId)
}

function save(loc) {
    if (loc.id) {
        loc.updatedAt = Date.now()
        return storageService.put(DB_KEY, loc)
    } else {
        loc.createdAt = loc.updatedAt = Date.now()
        return storageService.post(DB_KEY, loc)
    }
}

function setFilterBy(filterBy = {}) {
    if (filterBy.txt !== undefined) gFilterBy.txt = filterBy.txt
    if (filterBy.minRate !== undefined && !isNaN(filterBy.minRate)) gFilterBy.minRate = filterBy.minRate
    return gFilterBy
}

function getLocCountByRateMap() {
    return storageService.query(DB_KEY)
        .then(locs => {
            const locCountByRateMap = locs.reduce((map, loc) => {
                if (loc.rate > 4) map.high++
                else if (loc.rate >= 3) map.medium++
                else map.low++
                return map
            }, { high: 0, medium: 0, low: 0 })
            locCountByRateMap.total = locs.length
            return locCountByRateMap
        })
}


/* add fun for getting the dates  */
function getLocCountByUpdateTime() {
    const now = new Date()

    return storageService.query(DB_KEY)
        .then(locs => {
            const locCountByUpdateTime = {
                thisHour: 0,
                pastDay: 0,
                pastWeek: 0,
                never: 0,
                total: locs.length
            }
            locs.forEach(loc => {
                const lastUpdated = new Date(loc.updatedAt)
                const timeDiff = now.getTime() - lastUpdated.getTime()
                const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60))
                const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24))

                if (hoursDiff < 1) {
                    locCountByUpdateTime.thisHour++
                } else if (daysDiff < 1) {
                    locCountByUpdateTime.pastDay++
                } else if (daysDiff < 7) {
                    locCountByUpdateTime.pastWeek++
                } else {
                    locCountByUpdateTime.never++
                }
            })

            console.log(locCountByUpdateTime)
            return locCountByUpdateTime
        })
        .catch(error => {
            console.error('Error fetching location data:', error)
            throw error 
        })
}

function setSortBy(sortBy = {}) {
    gSortBy = sortBy
}

function _createLocs() {
    const locs = utilService.loadFromStorage(DB_KEY)
    if (!locs || !locs.length) {
        _createDemoLocs()
    }
}

function _createDemoLocs() {
    var locs =
        [
            {
                name: "Ben Gurion Airport",
                rate: 2,
                geo: {
                    address: "Ben Gurion Airport, 7015001, Israel",
                    lat: 32.0004465,
                    lng: 34.8706095,
                    zoom: 12
                },
            },
            {
                name: "Dekel Beach",
                rate: 4,
                geo: {
                    address: "Derekh Mitsrayim 1, Eilat, 88000, Israel",
                    lat: 29.5393848,
                    lng: 34.9457792,
                    zoom: 15
                },
            },
            {
                name: "Dahab, Egypt",
                rate: 5,
                geo: {
                    address: "Dahab, South Sinai, Egypt",
                    lat: 28.5096676,
                    lng: 34.5165187,
                    zoom: 11
                }
            }
        ]

    locs = locs.map(_createLoc)
    utilService.saveToStorage(DB_KEY, locs)
}

function _createLoc(loc) {
    loc.id = utilService.makeId()
    loc.createdAt = loc.updatedAt = utilService.randomPastTime()
    return loc
}



