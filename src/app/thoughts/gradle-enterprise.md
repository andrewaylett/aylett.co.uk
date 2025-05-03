---
title: Always applying the Gradle Enterprise plugin
author: Andrew Aylett
date: 2023/10/29
description:
    Learn how to configure the Gradle Enterprise plugin in an init script to
    avoid committing agreement to the terms of service into published projects.
tags:
    - Technology
---

I want to run the Gradle Enterprise plugin for every build, but Gradle say:

> Be careful not to commit agreement to the terms of service into a project that
> may be built by others.

So I don't want to add the plugin to the settings of any projects I publish.

The good news is that Gradle has a mechanism to set up "init" scripts, defined
in user scope. The bad news is that I couldn't find any documentation on how to
set up the Gradle Enterprise plugin in an init script.

So: put this content in a file located in your init scripts directors, say
`~/.gradle/init.d/scans.gradle`:

```groovy
initscript {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
    dependencies {
        classpath("com.gradle:gradle-enterprise-gradle-plugin:3.15.1")
    }
}

getGradle().settingsEvaluated { settings ->
    settings.plugins.apply(com.gradle.enterprise.gradleplugin.GradleEnterprisePlugin)

    settings.gradleEnterprise {
        buildScan {
            termsOfServiceUrl = "https://gradle.com/terms-of-service"
            termsOfServiceAgree = "yes"
            publishAlways()
        }
    }
}
```

Then make sure you remember to bump the version regularly as I'm not aware of
any tooling to help do that.
