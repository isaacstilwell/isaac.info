class DataManager {
    constructor(about, work, projects) {
        this.about = about; // about json
        this.work = work; // array of work jsons
        this.projects = projects; // array of project jsons
        this.displayedData = null;
        this.displayType = "none"; // "home" | "about" | "work" | "projects"
        this.currentIndex = 0 // current index of displayedData
    }

    _updateDisplayedData() {
        if (this.displayType === "about") {
            this.displayedData = this.about;
        } else if (this.displayType === "work") {
            this.displayedData = this.work;
        } else if (this.displayType === "projects") {
            this.displayedData = this.projects;
        } else { // home or anything else
            this.displayedData = null;
        }
    }

    setDisplay(display, index=0) {
        console.log(`setting display to ${display}`);
        this.displayType = display;
        this.currentIndex = index;
        this._updateDisplayedData();
        return this.displayedData ? this.displayedData[this.currentIndex] : null;
    }

    canDisplayNext() {
        return this.displayedData && this.currentIndex < this.displayedData.length - 1;
    }

    canDisplayPrevious() {
        return this.displayedData && this.currentIndex > 0;
    }

    displayCurrent() {
        return this.displayedData ? this.displayedData[this.currentIndex] : null;
    }

    displayNext() {
        if (this.canDisplayNext()) {
            this.currentIndex++;
            return this.displayedData[this.currentIndex];
        }
    }

    displayPrevious() {
        if (this.canDisplayPrevious()) {
            this.currentIndex--;
            return this.displayedData[this.currentIndex];
        }
    }
}

export { DataManager };
