// === Batch Replace & Render (ExtendScript-safe) ===
(function () {
    // JSON polyfill
    if (typeof JSON === "undefined") {
        JSON = {};
        JSON.parse = function (s) { return eval("(" + s + ")"); };
        JSON.stringify = function (o) { try { return o.toSource(); } catch (e) { return "" + o; } };
    }

    function log(msg){ $.writeln("[AE Batch] " + msg); }

    // config
    var batchPath   = "C:/Users/joani/PycharmProjects/ae_video_bot/ae_batch.json";
    var projectPath = "C:/Users/joani/PycharmProjects/ae_video_bot/ae_templates/ae_faces and names_template.aep";
    var compName    = "Intro_Template_Comp";     // change if needed
    var faceLayerNm = "#FACE_IMAGE";
    var nameLayerNm = "#NAME_TEXT";
    var omTemplate  = "Lossless";                // or your custom OM template
    var rendersPath = "C:/Users/joani/PycharmProjects/ae_video_bot/renders";
    var savePath    = "C:/Users/joani/PycharmProjects/ae_video_bot/ae_templates/ae_faces_and_names_master.aep";

    // read batch json
    var f = new File(batchPath);
    if (!f.exists) { alert("❌ Batch JSON not found:\n" + batchPath); return; }
    f.open("r");
    var content = f.read();
    f.close();

    var data = JSON.parse(content);
    if (!data || !data.jobs || !data.jobs.length) {
        alert("❌ No jobs in batch JSON.");
        return;
    }

    // open project
    app.open(new File(projectPath));

    // find comp
    function getCompByName(n){
        for (var i=1; i<=app.project.numItems; i++){
            var it = app.project.item(i);
            if (it instanceof CompItem && it.name === n) return it;
        }
        return null;
    }

    var baseComp = getCompByName(compName);
    if (!baseComp) {
        alert("❌ Composition '"+compName+"' not found.");
        return;
    }

    // ensure renders folder exists
    var rendersFolder = new Folder(rendersPath);
    if (!rendersFolder.exists) rendersFolder.create();

    // helper: check if a path is already in the render queue
    function isPathAlreadyInQueue(path) {
        for (var i = 1; i <= app.project.renderQueue.numItems; i++) {
            try {
                var existingFile = app.project.renderQueue.item(i).outputModule(1).file;
                if (existingFile && existingFile.fsName === path) {
                    return true;
                }
            } catch (e) {}
        }
        return false;
    }

    // process each job
    for (var idx=0; idx<data.jobs.length; idx++){
        var job = data.jobs[idx];
        log("Starting job "+(idx+1)+"/"+data.jobs.length);

        try {
            // duplicate comp per job
            var comp = baseComp.duplicate();

            // default label
            var compLabel = "job_" + (idx+1);

            // try to read person's name for label
            if (job.name) {
                var nameFile = new File(job.name);
                if (nameFile.exists) {
                    nameFile.open("r");
                    compLabel = nameFile.read().replace(/\r?\n|\r/g, ""); // strip line breaks
                    nameFile.close();
                }
            }

            // rename comp with actual name (fallback = job_X)
            comp.name = compName + " [" + compLabel + "]";

            // replace face
            var faceLayer = comp.layer(faceLayerNm);
            if (faceLayer && job.face) {
                var faceFile = new File(job.face);
                if (faceFile.exists) {
                    var faceItem = app.project.importFile(new ImportOptions(faceFile));
                    faceLayer.replaceSource(faceItem, false);
                } else {
                    log("⚠️ Face file missing: " + job.face);
                }
            } else {
                log("⚠️ Face layer missing or path not set.");
            }

            // replace name text
            var nameLayer = comp.layer(nameLayerNm);
            if (nameLayer && job.name) {
                var nameFile = new File(job.name);
                if (nameFile.exists) {
                    nameFile.open("r");
                    var newName = nameFile.read();
                    nameFile.close();
                    nameLayer.property("Source Text").setValue(newName);
                } else {
                    log("⚠️ Name file missing: " + job.name);
                }
            } else {
                log("⚠️ Name layer missing or path not set.");
            }

            // sanitize label for filename
            var safeLabel = compLabel.replace(/[^a-z0-9_\-]/gi, "_");

            // queue render with unique filename
            var rqItem = app.project.renderQueue.items.add(comp);
            try { rqItem.outputModule(1).applyTemplate(omTemplate); } catch(e){}

            var outFile = new File(rendersFolder.fsName + "/" + safeLabel + ".avi");
            var counter = 1;
            while (outFile.exists || isPathAlreadyInQueue(outFile.fsName)) {
                outFile = new File(rendersFolder.fsName + "/" + safeLabel + "_" + counter + ".avi");
                counter++;
            }
            rqItem.outputModule(1).file = outFile;

        } catch (eJob) {
            log("❌ Job "+(idx+1)+" failed: " + eJob.toString());
        }
    }

    // kick off the queue
    if (app.project.renderQueue.numItems > 0){
        log("Starting render of " + app.project.renderQueue.numItems + " item(s)...");
        app.project.renderQueue.render();
        log("✅ Batch render complete.");
    } else {
        alert("Nothing to render — check your batch JSON and comp/layer names.");
    }

    // === Always save master AE file ===
    try {
        app.project.save(new File(savePath));
        log("💾 Project saved as: " + savePath);
    } catch (e) {
        alert("❌ Could not save master project: " + e.toString());
    }
})();
