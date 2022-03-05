#!/usr/bin/node

const fs = require('fs');


function make_superstore_page(page){
    return {
        "1": {
            "page": String(page),
            "id": "1",
            "current_state_id": page,
            "region": [
                {
                    "x": 10,
                    "y": 90
                },
                {
                    "x": 297,
                    "y": 90
                },
                {
                    "x": 297,
                    "y": 291
                },
                {
                    "x": 10,
                    "y": 291
                }
            ],
            "top": 262,
            "left": 231,
            "makeCutout": true,
            "cutouts": [],
            "processed": true
        },
        "2": {
            "page": String(page),
            "id": "2",
            "current_state_id": page,
            "region": [
                {
                    "x": 2,
                    "y": 322
                },
                {
                    "x": 483,
                    "y": 322
                },
                {
                    "x": 483,
                    "y": 811
                },
                {
                    "x": 2,
                    "y": 811
                }
            ],
            "top": -448,
            "left": 612,
            "makeCutout": true,
            "cutouts": [],
            "processed": true
        },
        "3": {
            "page": String(page),
            "id": "3",
            "current_state_id": page,
            "region": [
                {
                    "x": 488,
                    "y": 322
                },
                {
                    "x": 969,
                    "y": 322
                },
                {
                    "x": 973,
                    "y": 810
                },
                {
                    "x": 488,
                    "y": 813
                }
            ],
            "top": 41,
            "left": 126,
            "makeCutout": true,
            "cutouts": [],
            "processed": true
        },
        "4": {
            "page": String(page),
            "id": "4",
            "current_state_id": page,
            "region": [
                {
                    "x": 971,
                    "y": 323
                },
                {
                    "x": 1456,
                    "y": 322
                },
                {
                    "x": 1459,
                    "y": 809
                },
                {
                    "x": 971,
                    "y": 813
                }
            ],
            "top": 529,
            "left": -357,
            "makeCutout": true,
            "cutouts": [],
            "processed": true
        }
    }
}


function make_superStore(){
    const obj = {
        "-1": {
            "0": {
                "page": "-1",
                "id": "0",
                "current_state_id": 0,
                "region": [
                    {
                        "x": 0,
                        "y": 0
                    },
                    {
                        "x": 1465,
                        "y": 0
                    },
                    {
                        "x": 1465,
                        "y": 913
                    },
                    {
                        "x": 0,
                        "y": 913
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
        }
    };

    for(let i = 0; i < 50; ++i){
        obj[String(i)] = make_superstore_page(i);
    }

    return obj;

}


const obj = {
    "hidden": {},
    "superstore": make_superStore(),
    "startState": {
        "saveName": "Sup",
        "appMode": [
            "superstore"
        ],
        "current_state": 0
    }
}

fs.writeFileSync('gen_fig4_1.json', JSON.stringify(obj));