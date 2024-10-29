export const statusName: { [key: number]: string } = {
    0: 'Waiting',
    1: 'Accepted',
    2: 'Wrong Answer',
    3: 'Time Exceeded',
    4: 'Memory Exceeded',
    5: 'Output Exceeded',
    6: 'Runtime Error',
    7: 'Compile Error',
    8: 'System Error',
    9: 'Cancelled',
    10: 'Unknown Error',
    11: 'Hacked',
    20: 'Running',
    21: 'Compiling',
    22: 'Fetched',
    30: 'Ignored',
    31: 'Format Error',
    32: 'Hack Successful',
    33: 'Hack Unsuccessful'
};
export const statusShortName: { [key: number]: string } = {
    1: 'AC',
    2: 'WA',
    3: 'TLE',
    4: 'MLE',
    5: 'OLE',
    6: 'RE',
    7: 'CE',
    8: 'SE',
    9: 'IGN',
    11: 'HK',
    30: 'IGN',
    31: 'FE'
};
export const statusIcon: { [key: number]: string } = {
    0: 'pending',
    1: 'pass',
    2: 'fail',
    3: 'fail',
    4: 'fail',
    5: 'fail',
    6: 'fail',
    7: 'fail',
    8: 'fail',
    9: 'ignored',
    10: 'fail',
    11: 'fail',
    20: 'progress',
    21: 'progress',
    22: 'progress',
    30: 'ignored',
    31: 'ignored',
    32: 'pass',
    33: 'fail'
};
export const statusEnded: { [key: number]: boolean } = {
    0: false,
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
    8: true,
    9: true,
    10: true,
    11: true,
    20: false,
    21: false,
    22: false,
    30: true,
    31: true,
    32: true,
    33: true
};
export const languageDisplayName: { [key: string]: string } = {
    "bash": "Bash",
    "c": "C",
    "cc": "C++",
    "cc.cc98": "C++98",
    "cc.cc98o2": "C++98(O2)",
    "cc.cc11": "C++11",
    "cc.cc11o2": "C++11(O2)",
    "cc.cc14": "C++14",
    "cc.cc14o2": "C++14(O2)",
    "cc.cc17": "C++17",
    "cc.cc17o2": "C++17(O2)",
    "cc.cc20": "C++20",
    "cc.cc20o2": "C++20(O2)",
    "pas": "Pascal",
    "java": "Java",
    "kt": "Kotlin",
    "kt.jvm": "Kotlin/JVM",
    "py": "Python",
    "py.py2": "Python 2",
    "py.py3": "Python 3",
    "py.pypy3": "PyPy3",
    "php": "PHP",
    "rs": "Rust",
    "hs": "Haskell",
    "js": "NodeJS",
    "go": "Golang",
    "rb": "Ruby",
    "cs": "C#",
    "r": "R",
};


export interface ProblemDoc {
    _id: string
    owner: number
    domainId: string
    docType: number
    docId: number
    title: string
    tag: string[]
    hidden: boolean
    nSubmit: number
    nAccept: number
    difficulty: number
    stats: {
        AC: number
        WA: number
        TLE: number
        MLE: number
        RE: number
        SE: number
        IGN: number
        CE: number
        s100: number
    }
}
export interface ProblemStatusDoc {
    _id: string
    docId: number
    docType: number
    domainId: string
    uid: number
    rid: string
    score: number
    status: number
    counter: number
}
export interface RecordDoc {
    _id: string
    status: number
    uid: number
    lang: string
    pid: number
    domainId: string
    score: number
    time: number
    memory: number
    judger: number
    judgeAt: string
    rejudged: boolean
    files: object
}
export interface UserDoc {
    uname: string
    mail: string
    perm: string
    role: string
    priv: number
    regat: string
    loginat: string
    tfa: boolean
    authn: boolean
}
