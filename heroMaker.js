#!/usr/bin/node

const fs = require('fs');


        
function makePage(pageID, state){

    const PEFStateMap = {
        'wa': 51,
        'or': 52,
        'ca': 54,
        'nv': 53,
        'ia': 2,
        'ut': 4,
        'az': 3,
        'nm': 8,
        'co': 7,
        'wy': 6,
        'mt': 5,
        'nm': 8,
        'tx': 9,
        'ok': 14,
        'ka': 13,
        'ne': 12,
        'sd': 11,
        'nd': 10,
        'la': 22,
        'ak': 21,
        'mo': 20,
        'ia': 19,
        'mn': 15,
        'ms': 23,
        'il': 24,
        'wi': 18,
        'al': 28,
        'tn': 27,
        'ky': 26,
        'in': 25,
        'mi': 16,
        'fl': 29,
        'ga': 30,
        'oh': 35,
        'sc': 31,
        'nc': 32,
        'va': 33,
        'wv': 34,
        'pa': 39,
        'ny': 40,
        'vt': 41,
        'nh': 42,
        'me': 43,
        'ma': 44,
        'ct': 47,
        'nj': 38,
        'de': 37,
        'md': 36,
        'hi': 49,
        'al': 50
    }

    const SFstateMap = {
        'wa': 6,
        'or': 8,
        'ca': 10,
        'nv': 14,
        'ia': 12,
        'ut': 18,
        'az': 16,
        'nm': 24,
        'co': 22,
        'wy': 20,
        'tx': 36,
        'ok': 34,
        'ks': 32,
        'ne': 30,
        'sd': 28,
        'nd': 26,
        'la': 38,
        'ar': 40,
        'mo': 42,
        'ia': 44,
        'mn': 46,
        'ms': 52,
        'tn': 64,
        'ky': 66,
        'il': 50,
        'wi': 48,
        'al': 54,
        'in': 68,
        'mi': 70,
        'fl': 56,
        'ga': 58,
        'oh': 72,
        'sc': 60,
        'nc': 62,
        'va': 74,
        'wv': 76,
        'md': 110,
        'de': 98,
        'pa': 78,
        'nj': 80,
        'ny': 82,
        'ct': 92,
        'ma': 90,
        'vt': 84,
        'nh': 88,
        'me': 86
    }
    const ret = { "1": {
            "page": String(pageID),
            "id": "1",
            "current_state_id": String(pageID),
            "region": [
                {
                    "x": 50.5,
                    "y": 159
                },
                {
                    "x": 754.5,
                    "y": 159
                },
                {
                    "x": 754.5,
                    "y": 528
                },
                {
                    "x": 50.5,
                    "y": 528
                }
            ],
            "top": 14,
            "left": -186,
            "makeCutout": true,
            "parentCanvas": "0",
            "cutouts": [],
            "processed": true,
        },
        "2": {
            "page": String(pageID),
            "id": "2",
            "current_state_id": String(pageID),
            "region": [
                {
                    "x": 50.5,
                    "y": 565
                },
                {
                    "x": 755.5,
                    "y": 565
                },
                {
                    "x": 755.5,
                    "y": 903
                },
                {
                    "x": 50.5,
                    "y": 903
                }
            ],
            "top": -22,
            "left": -187,
            "makeCutout": true,
            "parentCanvas": "0",
            "cutouts": [],
            "processed": true
        },
        "3": {
            "page": String(pageID),
            "id": "3",
            "current_state_id": String(pageID),
            "region": [
                {
                    "x": 50.5,
                    "y": 938
                },
                {
                    "x": 754.5,
                    "y": 938
                },
                {
                    "x": 754.5,
                    "y": 1257
                },
                {
                    "x": 50.5,
                    "y": 1257
                }
            ],
            "top": -375,
            "left": 516,
            "makeCutout": true,
            "parentCanvas": "0",
            "cutouts": [],
            "processed": true
        }
    }

    if(SFstateMap[state] != undefined) {
        if(!Array.isArray(ret['2']['linkedFrames'])) ret['2']['linkedFrames'] = [];
        ret['2']['linkedFrames'].push(
            {
                "instance": "state_facts_for_students",
                "page": "-1",
                "vcid": "0",
                "frames": [
                    [
                        parseInt(pageID) + 2,
                        parseInt(SFstateMap[state]),
                    ]
                ]
            }
        );
    }

    if(PEFStateMap[state] != undefined) {
        if(!Array.isArray(ret['2']['linkedFrames'])) ret['2']['linkedFrames'] = [];
        ret['2']['linkedFrames'].push(
            {
                "instance": "Public_Elementary-Secondary_School_System_Finances",
                "page": "-1",
                "vcid": "0",
                "frames": [
                    [
                        parseInt(pageID) + 2,
                        parseInt(PEFStateMap[state]),
                    ]
                ]
            }
        )
    }

    return ret;
}

function c19(){
    const obj = {};

    const stateMap = {
        'wa': 16,
        'or': 2,
        'ca': 18,
        'id': 19,
        'nv': 3,
        'az': 20,
        'ut': 4,
        'mt': 21,
        'wy': 22,
        'co': 23,
        'nm': 5,
        'tx': 7,
        'ok': 27,
        'ks': 26,
        'ne': 25,
        'sd': 24,
        'nd': 6,
        'la': 8,
        'ar': 31,
        'mo': 30,
        'ia': 29,
        'mn': 28,
        'ms': 34,
        'il': 36,
        'wi': 9,
        'al': 39,
        'tn': 11,
        'ky': 38,
        'in': 10,
        'mi': 35,
        'fl': 40,
        'ga': 12,
        'sc': 13,
        'nc': 41,
        'va': 42,
        'wv': 14,
        'oh': 37,
        'md': 44,
        'pa': 52,
        'ny': 51,
        'nh': 49,
        'vt': 50,
        'me': 15,
        'ma': 48,
        'ct': 47,
        'nj': 53,
        'de': 45,
        'hi': 1,
        'al': 17,
    }

    obj["-1"] = {
        "0": {
            "page": "-1",
            "id": "0",
            "current_state_id": 2,
            "region": [
                {
                    "x": 0,
                    "y": 0
                },
                {
                    "x": 800,
                    "y": 0
                },
                {
                    "x": 800,
                    "y": 1420
                },
                {
                    "x": 0,
                    "y": 1420
                }
            ],
            "top": 0,
            "left": 0,
            "makeCutout": false,
            "parentCanvas": false,
            "cutouts": [],
            "startupFn": null,
            "processed": true
        }
    };

    Object.entries(stateMap).forEach(([state, stateID]) => {
        obj[String(stateID)] = makePage(stateID, state);
    });

    return obj;
}

function sffs(){
    return {
        "-1": {
            "0": {
                "page": "-1",
                "id": "0",
                "current_state_id": 5,
                "region": [
                    {
                        "x": 0,
                        "y": 246
                    },
                    {
                        "x": 700,
                        "y": 246
                    },
                    {
                        "x": 700,
                        "y": 820
                    },
                    {
                        "x": 0,
                        "y": 820
                    }
                ],
                "top": -257,
                "left": 583,
                "makeCutout": false,
                "parentCanvas": false,
                "cutouts": [],
                "startupFn": null,
                "processed": true
            }
        }
    }
}

function pes(){
    return {
        "-1": {
            "0": {
                "page": "-1",
                "id": "0",
                "current_state_id": 58,
                "region": [
                    {
                        "x": 64.5,
                        "y": 530
                    },
                    {
                        "x": 762.5,
                        "y": 530
                    },
                    {
                        "x": 762.5,
                        "y": 714
                    },
                    {
                        "x": 64.5,
                        "y": 714
                    }
                ],
                "top": -541,
                "left": -183,
                "makeCutout": true,
                "parentCanvas": false,
                "cutouts": [],
                "processed": true
            }
        }
    }
}

const obj = {
    "hidden": {},
    "COVID-19_Affects_on_School_Finances_desktop": c19(),
    "state_facts_for_students_desktop": sffs(),
    "Public_Elementary-Secondary_School_System_Finances_desktop": pes(),
}

fs.writeFileSync('hero3.json', JSON.stringify(obj));